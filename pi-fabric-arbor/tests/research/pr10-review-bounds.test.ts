import assert from 'node:assert/strict';
import {mkdir,mkdtemp} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import test from 'node:test';
import {ResearchStore,type ResearchRun} from '../../src/research/ResearchStore.js';
import {resolveSpec} from '../../src/research/spec.js';
import {canonical} from '../../src/research/contracts.js';
test('PR10 independent review source provenance overflow rejects transactionally',async t=>{
 const base=resolve('.runtime/pr10-unit');await mkdir(base,{recursive:true});const root=await mkdtemp(join(base,'bounds-')),store=new ResearchStore(join(root,'research.sqlite3'));t.after(()=>store.close());
 const spec=await resolveSpec(root,{},{},{execution:'deferred',search:{maxDepth:5}},'fake/coordinator');
 const run:ResearchRun={id:'run',spec,requestHash:'r',owner:{id:'r',rootId:'r',ownerHostId:'h',ownerIdentityId:'o',sessionId:'s'},componentId:'arbor.owner',generation:'g',epoch:'epoch-1',revision:0,state:'ready',attemptsUsed:0,active:0,createdAt:1,activeMs:0,activeSince:null,steering:[],pendingDecisionId:null,execution:'not-started',error:null};store.create(run);
 const bind=(id:string)=>store.binding(store.get('run')!,id);
 for(let n=0;n<6;n++)store.research('propose',bind('node-'+n),{nodeId:'n'+n,type:n===5?'hypothesis':'direction',parentId:n?'n'+(n-1):null,title:'n'+n,rationale:'inspect',sourceRefs:Array.from({length:32},(_,i)=>'source-'+n+'-'+i)},'g');
 store.research('dispatch',bind('dispatch'),{nodeId:'n5',attemptId:'a'},'g');store.native('run','a','g',{id:'native',cwd:root,status:'completed'});
 const before=canonical(store.projection('run'));assert.throws(()=>store.research('distill',bind('distill'),{lessonId:'l',nodeId:'n5',insight:'bounded',limitations:'local',evidenceIds:[store.attempt('run','a')!.evidenceId]},'g'),/source.*capacity|bounded array/i);assert.equal(canonical(store.projection('run')),before);
});
