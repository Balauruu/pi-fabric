import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { ResearchStore, type ResearchRun } from '../../src/research/ResearchStore.js';
import { resolveSpec } from '../../src/research/spec.js';
import { ownedArtifactBytes } from '../../src/research/policy.js';
import { canonical, digest } from '../../src/research/contracts.js';

async function fixture(t: test.TestContext, overrides:Record<string,unknown>={}) {
  const base=resolve('.runtime/pr10-unit'); await mkdir(base,{recursive:true}); const root=await mkdtemp(join(base,'experience-'));
  const store=new ResearchStore(join(root,'state/research.sqlite3')); t.after(()=>store.close());
  const spec=await resolveSpec(root,{},{},{execution:'deferred',...overrides},'fake/coordinator');
  function create(id:string) { const run:ResearchRun={id,spec,requestHash:id,owner:{id:'root',rootId:'root',ownerHostId:'host',ownerIdentityId:'owner',sessionId:'session'},componentId:'arbor.owner',generation:'g1',epoch:'epoch-1',revision:0,state:'ready',attemptsUsed:0,active:0,createdAt:1,activeMs:0,activeSince:null,steering:[],pendingDecisionId:null,execution:'not-started',error:null};store.create(run);return run; }
  const binding=(runId:string,commandId:string)=>store.binding(store.get(runId)!,commandId);
  function node(runId:string,id:string) {store.research('propose',binding(runId,'node-'+id),{nodeId:id,type:'hypothesis',parentId:null,title:id,rationale:'cache parser',sourceRefs:[]},'g1');}
  function lesson(runId:string,id:string,insight:string) {
    node(runId,id);store.research('dispatch',binding(runId,'dispatch-'+id),{nodeId:id,attemptId:id},'g1');
    const evidence=store.native(runId,id,'g1',{id:'native-'+id,cwd:root,status:'completed'});
    const evidenceId=store.attempt(runId,id)!.evidenceId!;
    store.research('distill',binding(runId,'distill-'+id),{lessonId:id,nodeId:id,insight,limitations:'One local observation, re-test with target material',evidenceIds:[evidenceId]},'g1');return evidence;
  }
  return {root,store,create,binding,node,lesson};
}

test('PR10 fresh-v2 project retrieval retains negative/contrary provenance and explains duplicates without writes',async t=>{
  const f=await fixture(t);f.create('prior');f.lesson('prior','negative','cache parser regressed');f.lesson('prior','contrary','cache parser improved');f.lesson('prior','duplicate','cache parser regressed');f.create('next');
  const before=canonical(f.store.projection('prior'));const next=canonical(f.store.projection('next'));
  const hits=(f.store as any).lessons({runId:'next',query:'cache parser',limit:8});
  assert.equal(hits.length,3);assert.ok(hits.every((h:any)=>h.validation==='hypothesis-to-retest'&&h.runId==='prior'&&h.evidenceIds.length===1&&h.materialId));
  assert.equal(hits.filter((h:any)=>h.duplicateOf).length,1);assert.ok(hits.some((h:any)=>h.insight==='cache parser improved'));
  assert.equal(canonical(f.store.projection('prior')),before);assert.equal(canonical(f.store.projection('next')),next);
  f.store.close();const bytes=await readFile(f.store.path);const readOnly=new ResearchStore(f.store.path);assert.equal((readOnly as any).lessons({runId:'next',query:'cache parser',limit:8}).length,3);readOnly.close();assert.deepEqual(await readFile(f.store.path),bytes);
});

test('PR10 recalled lesson references bind source run/revision/digest and never adopt a grade',async t=>{
  const f=await fixture(t);f.create('prior');f.lesson('prior','negative','cache parser regressed');f.create('next');
  const hit=(f.store as any).lessons({runId:'next',query:'cache parser',limit:8})[0];
  const payload={nodeId:'new',type:'hypothesis',parentId:null,title:'Retest cache parser',rationale:'New local hypothesis',sourceRefs:[],lessonRefs:[hit.reference]};
  for(const reference of [{...hit.reference,runId:'forged'},{...hit.reference,revision:999},{...hit.reference,digest:'0'.repeat(64)}])assert.throws(()=>f.store.research('propose',f.binding('next','bad-'+digest(reference).slice(0,8)),{...payload,lessonRefs:[reference]},'g1'));
  f.store.research('propose',f.binding('next','good'),payload,'g1');assert.equal((f.store.projection('next')!.evaluations as any[]).length,0);assert.equal((f.store.projection('next')!.decisions as any[]).length,0);
});

test('PR10 second review delayed first completion binds original operation state and requires its receipt',async t=>{
 const f=await fixture(t);f.create('run');const command=f.binding('run','actor-delayed'),proposal={...command,version:2 as const,kind:'propose' as const,expectedEvidence:[],estimatedBudget:{attempts:0,evaluatorCalls:0},rationale:'Test',payload:{nodeId:'one',type:'hypothesis',parentId:null,title:'One',rationale:'Test',sourceRefs:[]}};
 f.store.recordProposal(proposal,'g1',{actorId:'actor',nativeId:'activation',requestId:'a'.repeat(64),context:{}});
 const receipt=f.store.research('propose',command,proposal.payload,'g1');f.store.control(f.binding('run','advance'),'g1','steer','Unrelated later command');
 assert.throws(()=>f.store.finishProposal('run',command.commandId,'g1',null,null),/receipt/);
 f.store.finishProposal('run',command.commandId,'g1',receipt,null);assert.equal(f.store.trajectories('run')[0]!.outcome!.revision,receipt.revision);
});
test('PR10 actual proposal trajectory stores bounded context references and exact outcome, never a transcript',async t=>{
  const f=await fixture(t);f.create('run');const proposal={...f.binding('run','actor-0'),version:2,kind:'propose',expectedEvidence:[],estimatedBudget:{attempts:0,evaluatorCalls:0},rationale:'Test cache parser',payload:{nodeId:'one',type:'hypothesis',parentId:null,title:'One',rationale:'cache parser',sourceRefs:[]}};
  const context={...f.binding('run','actor-0'),nodes:[],attempts:[],evidence:[],ancestors:[],contract:{privateHeldout:'NOT_IN_EXPORT'}};
  (f.store as any).recordProposal(proposal,'g1',{actorId:'actor',nativeId:'activation',requestId:'a'.repeat(64),context});
  const receipt=f.store.research('propose',f.binding('run','actor-0'),proposal.payload,'g1');(f.store as any).finishProposal('run','actor-0','g1',receipt,null);
  const entries=(f.store as any).trajectories('run');assert.ok(await ownedArtifactBytes(f.store,'run')>=Buffer.byteLength(canonical(entries)));assert.equal(entries.length,1);assert.deepEqual(entries[0].proposal,proposal);assert.equal(entries[0].context.id,digest(context));assert.equal(entries[0].outcome.receipt.commandId,receipt.commandId);assert.equal(entries[0].materialId,proposal.materialId);assert.ok(!canonical(entries).includes('NOT_IN_EXPORT'));
  assert.throws(()=>(f.store as any).recordProposal({...proposal,rationale:'forged'},'g1',{actorId:'actor',nativeId:'activation',requestId:'a'.repeat(64),context}));
  const saved=canonical(entries);f.store.control(f.binding('run','advance'),'g1','steer','New unrelated instruction');
  (f.store as any).recordProposal(proposal,'g1',{actorId:'actor',nativeId:'activation',requestId:'a'.repeat(64),context});
  (f.store as any).finishProposal('run','actor-0','g1',receipt,null);assert.equal(canonical((f.store as any).trajectories('run')),saved);
});
