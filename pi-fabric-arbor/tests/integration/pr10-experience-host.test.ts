import assert from 'node:assert/strict';
import { readFile, appendFile, mkdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';
import { host } from '../fixtures/pr6-host.js';
import { commandProgram,researchCommand } from '../../src/research/commands.js';
import { canonical,digest } from '../../src/research/contracts.js';
const exec=promisify(execFile);
for(const installed of [false,true])test(`PR10 ${installed?'clean-installed':'source'} actual actor lesson reuse and proposal export`,{timeout:420000},async t=>{
  const provider=(await readFile('tests/fixtures/pr2-fake-provider.ts','utf8')).replace("trace('research.proposal',{kind:p.kind,payload:p.payload,revision:p.revision,incumbent:data.currentIncumbent});",`if(p.kind==='propose'&&p.payload.type==='hypothesis'&&data.recalledLessons?.length)p.payload.lessonRefs=[(p.runId==='next'?data.recalledLessons.find(l=>l.outcome==='discarded'):data.recalledLessons[0]).reference];
trace('pr10.proposal',{proposal:p,contextId:JSON.stringify(data),recalled:data.recalledLessons??[]});
trace('research.proposal',{kind:p.kind,payload:p.payload,revision:p.revision,incumbent:data.currentIncumbent});`);
  const begin=commandProgram(researchCommand('start',JSON.stringify({runId:'research'})));
  const next=commandProgram(researchCommand('start',JSON.stringify({runId:'next',overrides:{search:{maxActorTurns:2}}})));
  const program=`const p=await(async()=>{${begin}})();const before=JSON.stringify(await tools.call({ref:'arbor.inspect',args:{runId:'research'}}));const lessons=await tools.call({ref:'arbor.lessons',args:{runId:'research',query:'',limit:8}});const unchanged=before===JSON.stringify(await tools.call({ref:'arbor.inspect',args:{runId:'research'}}));const r=p.run;const exported=await tools.call({ref:'arbor.export',args:{runId:r.id,materialId:r.spec.source.materialId,epoch:r.epoch,revision:r.revision,commandId:'pr10-export',format:'json'}});const second=await(async()=>{${next}})();return JSON.stringify({p:compactProjection(p),second:compactProjection(second),lessons,unchanged,exported});`;
  const h=await host('command',{installed,program,providerSource:provider});t.after(()=>h.store.close());
  assert.equal(h.value.p.run.execution,'research-stop:attempt-budget',h.root);assert.equal(h.value.unchanged,true);assert.equal(h.value.lessons.length,4);
  assert.ok(h.value.lessons.some((l:any)=>l.outcome==='discarded'));assert.ok(h.value.lessons.some((l:any)=>l.outcome==='invalid-evaluation'));
  const recalled=h.events.filter(e=>e.event==='pr10.proposal'&&e.data.proposal.runId==='next');assert.equal(recalled.length,2);assert.ok(recalled.every(e=>e.data.recalled.some((l:any)=>l.runId==='research')));
  const second=h.value.second;assert.equal(second.attempts.length,0);assert.equal(second.evaluations.length,1);assert.equal(second.decisions.length,0);assert.deepEqual(second.nodes.find((n:any)=>n.type==='hypothesis').lessonRefs,[h.value.lessons.find((l:any)=>l.outcome==='discarded').reference]);
  const artifact=JSON.parse(await readFile(h.value.exported.value.path,'utf8'));const proposals=h.events.filter(e=>e.event==='pr10.proposal'&&e.data.proposal.runId==='research');
  assert.equal(artifact.trajectories.length,proposals.length);for(const [i,entry] of artifact.trajectories.entries()) {assert.deepEqual(entry.proposal,proposals[i].data.proposal);assert.equal(entry.context.id,digest(JSON.parse(proposals[i].data.contextId)));assert.ok(entry.nativeId&&entry.requestId&&entry.outcome);assert.equal(entry.selectedAction,entry.proposal.kind);assert.ok(!('messages' in entry));if(['decide','distill'].includes(entry.proposal.kind)&&entry.proposal.payload.evidenceIds.length){assert.deepEqual(entry.outcome.evaluationIds,entry.proposal.payload.evidenceIds);assert.ok(entry.outcome.attemptIds.length&&entry.outcome.materialIds.length);}}
  const before=canonical(h.store.projection('research')),bytes=await readFile(h.value.exported.value.path);
  const cli=await exec(process.execPath,['bin/pi-fabric-arbor.mjs','artifact','--root',join(h.root,'state'),'--path','runs/research/exports/pr10-export.json'],{cwd:installed?join(h.root,'node_modules/pi-fabric-arbor'):process.cwd(),maxBuffer:2*1024*1024});
  assert.deepEqual(JSON.parse(cli.stdout),artifact);assert.equal(canonical(h.store.projection('research')),before);assert.deepEqual(await readFile(h.value.exported.value.path),bytes);
  await mkdir('.runtime/pr10-gates',{recursive:true});await appendFile('.runtime/pr10-gates/native-experience.jsonl',JSON.stringify({root:h.root,installed,proposals:proposals.length,lessons:h.value.lessons.length,recalled:recalled.length,exportPath:h.value.exported.value.path})+'\n');
});
