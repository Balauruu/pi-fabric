import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile,readdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import test from 'node:test';
import {ResearchStore} from '../../src/research/ResearchStore.js';
import {resolveSpec} from '../../src/research/spec.js';
import {SourceView,reportMarkdown,trajectoryMarkdown} from '../../src/presentation/SourceView.js';
import {ReadOnlyServer} from '../../src/presentation/ReadOnlyServer.js';
import {runReadOnlyCli} from '../../src/cli/read-only.js';
async function fixture(t:test.TestContext){
 await mkdir('.runtime/pr12-unit',{recursive:true});const root=await mkdtemp(resolve('.runtime/pr12-unit/view-'));
 const store=new ResearchStore(join(root,'research.sqlite3'));t.after(()=>store.close());
 const spec=await resolveSpec(root,{},{},{execution:'deferred'},'fake/model');
 store.create({id:'run',spec,requestHash:'r',owner:{id:'root',rootId:'root',ownerHostId:'host',ownerIdentityId:'owner',sessionId:'session'},componentId:'arbor.owner',generation:'g',epoch:'epoch-1',revision:0,state:'ready',attemptsUsed:0,active:0,createdAt:1,activeMs:0,activeSince:null,steering:[],pendingDecisionId:null,execution:'not-started',error:null});
 store.research('propose',store.binding(store.get('run')!,'node'),{nodeId:'h',type:'hypothesis',parentId:null,title:'Exact evidence',rationale:'Check facts',sourceRefs:[]},'g');
 store.research('decide',store.binding(store.get('run')!,'choice'),{decisionId:'review',nodeId:'h',decision:'request_review',evidenceIds:[]},'g');
 const view=new SourceView(root);return {root,store,view};
}
test('PR12 argument parsing never confuses export format or text with another run',async t=>{
 const {view}=await fixture(t),{PiPresentation}=await import('../../src/presentation/PiPresentation.js');const p=view.project('run')!,rows=new Map(['run','report','older'].map(id=>[id,{...p,run:{...p.run,id}}]));view.project=id=>rows.get(id)??null;view.runs=()=>[rows.get('run')!.run,rows.get('report')!.run];const ui=new PiPresentation({} as any);ui.source=async()=>view;const ctx:any={cwd:'project',hasUI:true,sessionManager:{getSessionId:()=> 'session'},ui:{select:async()=>{throw new Error('Unexpected picker');}}};await ui.prepare('pause','--run run',ctx);const exported=await ui.prepare('export','report',ctx);assert.equal(exported!.args.runId,'run');assert.equal(exported!.args.format,'report');await assert.rejects(ui.prepare('steer','report now',ctx),/Ambiguous text/);assert.equal((await ui.prepare('steer','--run run report now',ctx))!.args.instruction,'report now');assert.equal((await ui.prepare('pause','older',ctx))!.args.runId,'older');await assert.rejects(ui.prepare('show','missing',ctx),/Unknown explicit/);
});
test('PR12 live presentation refuses configured and active store drift',async t=>{
 const {root}=await fixture(t),{PiPresentation}=await import('../../src/presentation/PiPresentation.js');const old=process.env.PI_CODING_AGENT_DIR;process.env.PI_CODING_AGENT_DIR=join(root,'isolated-profile');try{await mkdir(join(root,'.pi'));await writeFile(join(root,'.pi/fabric.json'),JSON.stringify({components:[{component:'arbor',config:{stateDirectory:join(root,'configured')}}]}));let active=join(root,'active');const ui=new PiPresentation({} as any,()=>active),ctx:any={cwd:root,isProjectTrusted:()=>true};await assert.rejects(ui.source(ctx),/differs from active owner/);active=join(root,'configured');assert.equal((await ui.source(ctx))!.directory,active);}finally{if(old===undefined)delete process.env.PI_CODING_AGENT_DIR;else process.env.PI_CODING_AGENT_DIR=old;}
});
test('PR12 UI research admission remains on normal execute policy with optional owner-held lifetime',async()=>{
 const {commandProgram,researchCommand}=await import('../../src/research/commands.js');for(const background of [false,true]){const calls:any[]=[],p={run:{id:'run',spec:{config:{execution:'research'},source:{materialId:'m'}},epoch:'e',revision:1}};const request={...researchCommand('start',JSON.stringify({runId:'run'})),...(background?{background:true}:{})};const program=new Function('tools',`return(async()=>{${commandProgram(request)}})()`);await assert.rejects(program({call:async(call:any)=>{calls.push(call);if(call.ref==='arbor.start')return p;throw new Error('execute permission denied');}}),/execute permission denied/);assert.deepEqual(calls.map(c=>c.ref),['arbor.start','arbor.runResearch']);assert.equal(calls[1].args.background,background?true:undefined);}
});
test('PR12 cold offline projection and CLI reads preserve database bytes and inventory',async t=>{
 const {root,store,view}=await fixture(t),p=view.project('run');store.close();const before=await readFile(store.path),files=(await readdir(root)).filter(p=>!p.endsWith('-shm')).sort();assert.deepEqual(view.project('run'),p);assert.ok(view.replay('run'));let output='';const io={stdout:{write:(s:string|Uint8Array)=>{output+=Buffer.from(s).toString();return true;}},stderr:{write:()=>true}};assert.equal(await runReadOnlyCli(['inspect','--state',root,'--run','run'],io),0);assert.deepEqual(JSON.parse(output),p);assert.deepEqual(await readFile(store.path),before);assert.deepEqual((await readdir(root)).filter(p=>!p.endsWith('-shm')).sort(),files);
});
test('PR12 shared current projection and replay do not create or change research state',async t=>{
 const {root,store,view}=await fixture(t);const p=store.projection('run');const before=await readFile(store.path);const inventory=await readdir(root);
 assert.deepEqual(view.project('run'),p);assert.equal(view.runs()[0]!.id,'run');assert.equal(view.replay('run')!.revision,(p!.run as any).revision);
 assert.match(reportMarkdown(p!),/awaiting_review/);assert.match(reportMarkdown(p!),/Pending review: review/);assert.match(reportMarkdown(p!),/not a measured win/i);assert.match(trajectoryMarkdown([]),/No recorded proposals/);
 let out='';const io={stdout:{write:(s:string|Uint8Array)=>{out+=Buffer.from(s).toString();return true;}},stderr:{write:()=>true}};
 assert.equal(await runReadOnlyCli(['inspect','--state',root,'--run','run'],io),0);assert.deepEqual(JSON.parse(out),p);
 out='';assert.equal(await runReadOnlyCli(['replay','--state',root,'--run','run'],io),0);assert.equal(JSON.parse(out).revision,(p!.run as any).revision);
 assert.deepEqual(await readFile(store.path),before);assert.deepEqual(await readdir(root),inventory);assert.deepEqual(store.projection('run'),p);
 const absent=new SourceView(join(root,'missing'));assert.deepEqual(absent.runs(),[]);assert.equal(absent.project('none'),null);assert.deepEqual(await readdir(root),inventory);
});
test('PR12 production server read routes, SSE and existing artifacts reject all mutations without writes',async t=>{
 const {root,store,view}=await fixture(t);const path=join(root,'existing.json');await writeFile(path,'existing export\n');store.exported(store.binding(store.get('run')!,'exported'),'g',path,'0'.repeat(64));
 // Deliberately forged digest must fail retrieval rather than silently serve changed bytes.
 const server=await ReadOnlyServer.start(view);t.after(()=>server.close());const before=store.projection('run');const bytes=await readFile(store.path);
 for(const route of ['/','/?run=run','/index.html?run=run','/assets/app.js','/assets/app.css','/api/runs','/api/projection?run=run','/api/replay?run=run'])assert.equal((await fetch(server.url+route)).status,200,route);
 const response=await fetch(server.url+'/api/events?run=run');assert.ok(response.headers.get('content-type')!.includes('text/event-stream'));
 await response.body?.cancel();
 for(const method of ['POST','PUT','PATCH','DELETE'])assert.equal((await fetch(server.url+'/api/projection?run=run',{method})).status,405);
 for(const route of ['/api/start','/api/export','/api/review?run=run','/api/projection?run=run&action=cancel','/api/artifact?run=run&id=missing&generate=true'])assert.ok([404,405].includes((await fetch(server.url+route)).status),route);
 assert.deepEqual(store.projection('run'),before);assert.deepEqual(await readFile(store.path),bytes);
});

test('PR12 F1 latest-node selection cannot silently switch to another continuation revision',async t=>{
 const {view,store}=await fixture(t);const {PiPresentation}=await import('../../src/presentation/PiPresentation.js');const {commandProgram}=await import('../../src/research/commands.js');const p=view.project('run')!;p.attempts=[{id:'older',nodeId:'h',state:'completed'},{id:'latest',nodeId:'h',state:'completed'}];view.project=()=>p;
 const ui=new PiPresentation({} as any);ui.source=async()=>view;let labels:string[]=[];const context:any={cwd:'project',hasUI:true,sessionManager:{getSessionId:()=> 'session'},ui:{select:async(_t:string,options:string[])=>{labels=options;return options[0];}}};
 const request=await ui.prepare('keep','',context);assert.deepEqual(labels,['latest · completed']);assert.equal(request!.selectionRevision,p.run.revision);
 let calls=0;const tools={call:async()=>{calls++;return {...p,run:{...p.run,revision:p.run.revision+1}};}};const run=new Function('tools',`return(async()=>{${commandProgram(request!)}})()`);await assert.rejects(run(tools),/changed after UI selection/);assert.equal(calls,1);assert.equal(store.get('run')!.revision,p.run.revision);
});
test('PR12 F2 current selection prefers unique live owned run and remains project-scoped',async t=>{
 const {view}=await fixture(t);const {PiPresentation}=await import('../../src/presentation/PiPresentation.js');const p=view.project('run')!,live={...p.run,id:'live',state:'running'},done={...p.run,id:'newer',state:'completed'};view.runs=()=>[done,live];view.ownedRunSelection=()=>({total:1,runs:[live]});view.project=id=>({...p,run:id==='live'?live:done});const ui=new PiPresentation({} as any);ui.source=async()=>view;const context:any={cwd:'project',hasUI:true,sessionManager:{getSessionId:()=> 'session'},ui:{select:async()=>{throw new Error('Unexpected ambiguous selection');}}};assert.equal((await ui.prepare('pause','',context))!.args.runId,'live');
 const other=new SourceView(view.directory+'-other');other.runs=()=>[{...live,id:'other'}];other.ownedRunSelection=()=>({total:1,runs:other.runs()});other.project=()=>({...p,run:{...live,id:'other'}});ui.source=async()=>other;assert.equal((await ui.prepare('pause','',context))!.args.runId,'other');
 const fresh=new PiPresentation({} as any);fresh.source=async()=>view;view.runs=()=>[live,{...live,id:'second'}];view.ownedRunSelection=()=>({total:2,runs:view.runs()});let offered:string[]=[];context.ui.select=async(_t:string,rows:string[])=>{offered=rows;return rows[1];};assert.equal((await fresh.prepare('cancel','',context))!.args.runId,'second');assert.equal(offered.length,2);
});
test('PR12 F4 artifact retrieval verifies source-journal object identity and exact bytes',async t=>{
 const {root,store,view}=await fixture(t);const {canonical,digest}=await import('../../src/research/contracts.js');const journal={intent:{kind:'apply',operationId:'apply-1'},state:'applied',patch:'source delta'};const path=join(root,'journal.json'),text=canonical(journal)+'\n';await writeFile(path,text);const run=store.get('run')!;store.sourceReceipt(store.binding(run,'apply-1'),'g','apply','keep',path,digest(journal),null,run.owner,run.componentId);const id='source-'+digest('apply-1');assert.equal((await view.artifact('run',id)).toString(),text);await writeFile(path,JSON.stringify(journal)+'\n');await assert.rejects(view.artifact('run',id),/digest mismatch/);
});
test('PR12 scaffold remains reachable without a saved run and intake preview retains configured writer tools',async()=>{
 const {PiPresentation}=await import('../../src/presentation/PiPresentation.js');const {resolveConfiguration}=await import('../../src/research/spec.js');const ui=new PiPresentation({} as any);ui.source=async()=>{throw new Error('Scaffold must not require research state');};await assert.rejects(ui.prepare('scaffold','{}',{} as any),/required/);
 const p=await resolveConfiguration(process.cwd(),{roleTools:{executor:['bash']},objective:{unit:'points'}},{execution:'research'},{});assert.deepEqual(p.config.roleTools.executor,['bash']);assert.equal(p.origins['roleTools.executor'],'profile');assert.equal(p.config.evaluator.definition,'unconfigured');
});
