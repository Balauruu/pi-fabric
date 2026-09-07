import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import test from 'node:test';
import {Grounding} from '../../src/research/Grounding.js';
import {ResearchStore,type ResearchRun} from '../../src/research/ResearchStore.js';
import {resolveSpec} from '../../src/research/spec.js';
import {digest,canonical} from '../../src/research/contracts.js';
import {SourceCatalog,readSourceCatalog} from '../../src/research/SourceCatalog.js';
import {sourceSearchInputSchema,sourceSearchOutputSchema,sourceFetchInputSchema,sourceFetchOutputSchema} from '../../src/research/GroundingContracts.js';
test('PR10 finite source catalog and exact optional descriptor commitments reject capability widening',async t=>{
 const base=resolve('.runtime/pr10-unit');await mkdir(base,{recursive:true});const root=await mkdtemp(join(base,'catalog-')),path=join(root,'catalog.json');
 assert.deepEqual(readSourceCatalog(path),[]);const entry={id:'public',search:{ref:'public.search',descriptorHash:'a'.repeat(64)},fetch:{ref:'public.fetch',descriptorHash:'b'.repeat(64)}};
 await writeFile(path,JSON.stringify([entry]));assert.deepEqual(readSourceCatalog(path),[entry]);
 for(const value of [[entry,entry],[{...entry,search:{...entry.search,ref:'arbor.propose'}}],Array.from({length:5},(_,i)=>({...entry,id:'id'+i}))]){await writeFile(path,JSON.stringify(value));assert.throws(()=>readSourceCatalog(path));}
 const missing=new SourceCatalog([entry],{bindings:{}} as any,async()=>{throw new Error('must not dispatch')});assert.throws(()=>missing.binding('public','search'),/unavailable/);
 const mismatched=new SourceCatalog([entry],{bindings:{'public.search':{descriptorHash:'b'.repeat(64)}}} as any,async()=>null);assert.throws(()=>mismatched.binding('public','search'),/descriptor mismatch/);
});
test('PR10 source provider schemas, risk/effects and callee-mutated requests fail before factual ingestion',async()=>{
 const entry={id:'public',search:{ref:'public.search',descriptorHash:'a'.repeat(64)},fetch:{ref:'public.fetch',descriptorHash:'b'.repeat(64)}},view={bindings:{'public.search':{descriptorHash:'a'.repeat(64)},'public.fetch':{descriptorHash:'b'.repeat(64)}}} as any;
 for(const kind of ['search','fetch'] as const){const input=kind==='search'?sourceSearchInputSchema():sourceFetchInputSchema(),output=kind==='search'?sourceSearchOutputSchema():sourceFetchOutputSchema(),args=kind==='search'?{query:'parser',limit:1}:{url:'https://example.test/a',maxChars:100};let calls=0;
  const descriptor={name:kind,description:kind,inputSchema:input,outputSchema:output,risk:'read',effect:{kind:'none',resources:[],ordering:'commutative'}} as any;
  const make=(d:any,poison=false)=>new SourceCatalog([entry],view,async(_ref,a)=>{calls++;if(poison)Object.assign(a,kind==='search'?{query:'forged'}:{url:'https://forged.test/'});return kind==='search'?{results:[]}:{url:args.url,title:'Title',text:'Passage'};},async()=>d);
  await assert.rejects(make({...descriptor,risk:'write'}).invoke('public',kind,args,async()=>{}),/descriptor/);assert.equal(calls,0);
  await assert.rejects(make({...descriptor,outputSchema:{type:'object'}}).invoke('public',kind,args,async()=>{}),/descriptor/);assert.equal(calls,0);
  await assert.rejects(make(descriptor,true).invoke('public',kind,args,async()=>{}),/mutated/);assert.equal(calls,1);
  await make(descriptor).invoke('public',kind,args,async()=>{});assert.equal(calls,2);
 }
});

async function fixture(t:test.TestContext,customize?:(spec:Awaited<ReturnType<typeof resolveSpec>>)=>void){const base=resolve('.runtime/pr10-unit');await mkdir(base,{recursive:true});const root=await mkdtemp(join(base,'grounding-')),store=new ResearchStore(join(root,'research.sqlite3'));t.after(()=>store.close());const spec=await resolveSpec(root,{},{},{execution:'deferred'},'fake/coordinator');customize?.(spec);const run:ResearchRun={id:'run',spec,requestHash:'run',owner:{id:'root',rootId:'root',ownerHostId:'host',ownerIdentityId:'owner',sessionId:'session'},componentId:'arbor.owner',generation:'g1',epoch:'epoch-1',revision:0,state:'ready',attemptsUsed:0,active:0,createdAt:1,activeMs:0,activeSince:null,steering:[],pendingDecisionId:null,execution:'not-started',error:null};store.create(run);const command=()=>store.binding(store.get('run')!,'grounding');return {root,store,command};}
test('PR10 required grounding cannot be bypassed by an unlinked hypothesis',async t=>{
 const f=await fixture(t,s=>{s.config.grounding={mode:'required',catalog:'public',query:null,maxSources:1,model:null};});const before=canonical(f.store.projection('run'));
 assert.throws(()=>f.store.research('propose',f.command(),{nodeId:'unlinked',type:'hypothesis',parentId:null,title:'Not grounded',rationale:'No source',sourceRefs:['https://example.test/a']},'g1'),/inspected source reference/);assert.equal(canonical(f.store.projection('run')),before);
});
test('PR10 retirement during descriptor await prevents source dispatch and retains uncertain reservation without retry',async t=>{
 let retired=false,calls=0;const entry={id:'public',search:{ref:'public.search',descriptorHash:'a'.repeat(64)},fetch:{ref:'public.fetch',descriptorHash:'b'.repeat(64)}};
 const catalog=new SourceCatalog([entry],{bindings:{'public.search':{descriptorHash:'a'.repeat(64)},'public.fetch':{descriptorHash:'b'.repeat(64)}}} as any,async()=>{calls++;return {results:[]}},async()=>{retired=true;return {name:'search',description:'Search',inputSchema:sourceSearchInputSchema(),outputSchema:sourceSearchOutputSchema(),risk:'read',effect:{kind:'none',resources:[],ordering:'commutative'}};});
 const f=await fixture(t,s=>{s.config.grounding={mode:'optional',catalog:'public',query:null,maxSources:1,model:'fake/literature'};s.groundingCatalog={id:catalog.id,bindings:['search','fetch'].map(k=>catalog.binding('public',k as 'search'|'fetch').binding)};s.roles.literature={model:'fake/literature',origin:'explicit',instructionsId:null,tools:['read'],requires:[],resultContract:'arbor.literature-result.v1'};});
 const grounding=new Grounding({generation:'g1'} as any,f.store,f.root,catalog,()=>retired),context={extensionContext:{modelRegistry:{getAvailable:()=>[{provider:'fake',id:'literature'}]}}} as any;
 await assert.rejects(grounding.run('run',context),/retired/);assert.equal(calls,0);assert.equal(f.store.get('run')!.grounding!.status,'reserved');retired=false;assert.equal(await grounding.run('run',context),false);assert.equal(calls,0);
});

test('PR10 only visited exact passages gain immutable inspected-source facts; forged, stale and snippet bindings fail',async t=>{
 const f=await fixture(t),s=f.store as any; s.reserveGrounding(f.command(),'g1',digest('catalog'));
 const run=f.store.get('run')!,text='Visited full article. Caching avoids repeated parsing.',path=join(f.root,'passage.txt');await writeFile(path,text);
 const access={id:'access-one',kind:'source-access',runId:run.id,materialId:run.spec.source.materialId,epoch:run.epoch,specId:run.spec.identity,generation:run.generation,revision:run.revision,catalogId:digest('catalog'),url:'https://example.test/article',title:'Article',artifact:{path,digest:digest(text)},search:{ref:'public.search',binding:'binding',requestId:digest('query'),resultId:digest('search')},fetch:{ref:'public.fetch',binding:'binding',requestId:digest('url'),resultId:digest('fetch')},characters:text.length,validation:'visited-not-yet-inspected'};
 s.recordSourceAccess(f.command(),'g1',access);
 const result={value:{sentinel:'ARBOR_LITERATURE_RESULT_V1',batchId:s.get('run').grounding.batchId,sources:[{accessId:access.id,passage:'Caching avoids repeated parsing.',claim:'Test a cache',limitations:'Retest locally'}],blocked:null},nativeId:'native',requestId:digest('native'),roleBundleId:'roles-'+digest('roles'),model:'fake/literature'};
 for(const source of [{...result.value.sources[0],accessId:'unvisited'},{...result.value.sources[0],passage:'Discovery snippet only'}]) assert.throws(()=>s.completeGrounding(f.command(),'g1',{...result,value:{...result.value,sources:[source]}}));
 s.completeGrounding(f.command(),'g1',result);const inspected=(s.projection('run').artifact_refs as any[]).find(a=>a.kind==='source-inspection');assert.ok(inspected);assert.equal(inspected.validation,'source-linked-hypothesis-not-grade');
 const reference={sourceId:inspected.id,runId:'run',revision:inspected.revision,digest:inspected.digest};
 const propose=(ref:any,id:string)=>s.research('propose',{...f.command(),commandId:id},{nodeId:id,type:'hypothesis',parentId:'direction',title:'Grounded idea',rationale:'Retest',sourceRefs:[],groundingRefs:[ref]},'g1');
 for(const ref of [{...reference,runId:'other'},{...reference,revision:999},{...reference,digest:'0'.repeat(64)},{...reference,sourceId:access.id}])assert.throws(()=>propose(ref,'bad-'+digest(ref).slice(0,8)));
 s.research('propose',{...f.command(),commandId:'direction'},{nodeId:'direction',type:'direction',parentId:null,title:'Parser direction',rationale:'Retest',sourceRefs:[]},'g1');
 propose(reference,'good');assert.equal(s.projection('run').evaluations.length,0);
 s.research('dispatch',{...f.command(),commandId:'dispatch'},{nodeId:'good',attemptId:'attempt'},'g1');s.native('run','attempt','g1',{id:'native-attempt',cwd:f.root,status:'completed'});
 const evidenceId=s.attempt('run','attempt').evidenceId;s.research('distill',{...f.command(),commandId:'direction-lesson'},{lessonId:'direction-lesson',nodeId:'direction',insight:'Grounded child observation',limitations:'Retest this direction in new material',evidenceIds:[evidenceId]},'g1');
 assert.deepEqual(s.projection('run').lessons[0].provenance.sourceIds,[inspected.id]);

 const before=canonical(s.projection('run'));await writeFile(path,'changed passage');assert.throws(()=>propose(reference,'stale'),/source|artifact/i);assert.equal(canonical(s.projection('run')),before);
});
