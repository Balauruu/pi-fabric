/// <reference lib="dom" />
// Production browser assets and listener, with only saved candidate facts supplied.
for(const finding of ['W2','W4'])test(`PR12 ${finding} browser transport loss and failed candidate binding are explicit`,async t=>{
 const f=await fixture(t),p=f.view.project('old-live')!;p.nodes=[{nodeId:'h',type:'hypothesis',title:'h',rationale:'saved'}];p.attempts=['A','B'].map(id=>({id,nodeId:'h',state:'completed'}));f.view.project=()=>p;f.view.diff=(_run,attempt,revision)=>{if(attempt==='B')throw new Error('Candidate B unavailable');return {runId:'old-live',attemptId:attempt,revision,parent:'p',selected:'s',baseline:'b',patch:'diff --git A'};};
 process.env.PLAYWRIGHT_BROWSERS_PATH=resolve('.runtime/pr12-browsers');const {chromium}=await import('playwright');const server=await ReadOnlyServer.start(f.view),browser=await chromium.launch();let closed=false;t.after(async()=>{await browser.close();if(!closed)await server.close();});const page=await browser.newPage();await page.goto(server.url+'/?run=old-live');await page.waitForFunction(()=>document.getElementById('status')!.textContent!.includes('Revision'));
 if(finding==='W2'){await server.close();closed=true;await page.waitForFunction(()=>document.getElementById('status')!.textContent!.includes('Disconnected'),{},{timeout:2500});assert.match(await page.locator('#status').innerText(),/stale/i);}
 else{await page.getByRole('button',{name:'Inspect candidate A · completed',exact:true}).click();await page.waitForFunction(()=>document.getElementById('diff-binding')!.textContent!.startsWith('A ·'));await page.getByRole('button',{name:'Tree',exact:true}).click();await page.getByRole('button',{name:'Inspect candidate B · completed',exact:true}).click();await page.waitForFunction(()=>document.getElementById('patch')!.textContent!.includes('Candidate B unavailable'));assert.equal(await page.locator('#diff-binding').innerText(),'');}
});
import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {ResearchStore} from '../../src/research/ResearchStore.js';
import {resolveSpec} from '../../src/research/spec.js';
import {SourceView} from '../../src/presentation/SourceView.js';
import {PiPresentation} from '../../src/presentation/PiPresentation.js';
import {ReadOnlyServer} from '../../src/presentation/ReadOnlyServer.js';
import {commandProgram,researchCommand} from '../../src/research/commands.js';
async function fixture(t:test.TestContext){
 await mkdir('.runtime/pr12-unit',{recursive:true});const root=await mkdtemp(resolve('.runtime/pr12-unit/repairs-')),store=new ResearchStore(join(root,'research.sqlite3'));t.after(()=>store.close());const spec=await resolveSpec(root,{},{},{execution:'deferred'},'fake/model');
 const row={id:'old-live',spec,requestHash:'r',owner:{id:'root',rootId:'root',ownerHostId:'host',ownerIdentityId:'owner',sessionId:'session'},componentId:'arbor.owner',generation:'g',epoch:'epoch-1',revision:0,state:'ready' as const,attemptsUsed:0,active:0,createdAt:1,activeMs:0,activeSince:null,steering:[],pendingDecisionId:null,execution:'not-started',error:null};store.create(row);const view=new SourceView(root),ui=new PiPresentation({} as any);ui.source=async()=>view;const ctx:any={cwd:root,hasUI:false,sessionManager:{getSessionId:()=> 'session'},ui:{notify:()=>{}}};return{root,store,row,view,ui,ctx};
}
test('PR12 O1 provider start and resume select ordinary execute admission',async()=>{
 for(const operation of ['start','resume']){const calls:string[]=[],p={run:{id:'run',spec:{config:{execution:'evaluate'},evaluation:{kind:'provider'},source:{materialId:'m'}},epoch:'e',revision:1},evaluations:[]};const code=commandProgram(researchCommand(operation,operation==='start'?'{"runId":"run"}':'run'));const execute=new Function('tools',`return(async()=>{${code}})()`);await assert.rejects(execute({call:async({ref}:any)=>{calls.push(ref);if(ref==='arbor.evaluate')throw new Error('execute denied');return p;}}),/execute denied/);assert.equal(calls.at(-1),'arbor.evaluate');}
});
test('PR12 O4 complete owned inventory precedes bounded picker',async t=>{
 const f=await fixture(t);for(let i=0;i<128;i++)f.store.create({...f.row,id:'done-'+i,state:'completed'});f.store.create({...f.row,id:'new-live'});await assert.rejects(f.ui.prepare('pause','',f.ctx),/Multiple research runs/);f.ctx.hasUI=true;let labels:string[]=[];f.ctx.ui.select=async(_:string,rows:string[])=>{labels=rows;return rows[0];};await f.ui.prepare('pause','',f.ctx);assert.equal(labels.length,2);assert.ok(labels.some(s=>s.startsWith('old-live')));
});
for(const phase of ['intake','source'])test(`PR12 W3 close retires start held in ${phase}`,async t=>{
 const f=await fixture(t);let release!:(value:any)=>void;if(phase==='intake')f.ui.intake=async()=>new Promise(r=>{release=r;});else f.ui.source=async()=>new Promise(r=>{release=r;});const opening=f.ui.prepare('start',phase==='intake'?'':'{"runId":"new"}',f.ctx);void opening.catch(()=>{});await f.ui.close();release(phase==='intake'?researchCommand('start','{"runId":"new"}'):f.view);await assert.rejects(opening,/retired/);
});
test('PR12 W3 explicit close retires an in-progress browser directory switch',async t=>{
 const f=await fixture(t);let release!:()=>void,starts=0,notices=0;f.ctx.ui.notify=()=>{notices++;};t.mock.method(ReadOnlyServer,'start',async(source:SourceView)=>{starts++;return{view:source,url:'http://127.0.0.1:12001',close:async()=>starts===1?new Promise<void>(r=>{release=r;}):undefined} as any;});await f.ui.prepare('browser','old-live',f.ctx);const next={directory:f.root+'/second',runs:f.view.runs.bind(f.view),project:f.view.project.bind(f.view),ownedRunSelection:f.view.ownedRunSelection.bind(f.view)} as SourceView;f.ui.source=async()=>next;const opening=f.ui.prepare('browser','old-live',f.ctx);void opening.catch(()=>{});await new Promise(r=>setImmediate(r));const closing=f.ui.close();release();await closing;await assert.rejects(opening,/retired/);assert.equal(starts,1);assert.equal(notices,1);
});
test('PR12 W3 close retires general run picker before further UI',async t=>{
 const f=await fixture(t);let release!:(value:string)=>void,widgets=0,selections=0;f.ctx.hasUI=true;f.ctx.ui.setWidget=()=>{widgets++;};f.view.ownedRunSelection=()=>({total:2,runs:[f.store.get('old-live')!,{...f.store.get('old-live')!,id:'other'}]});f.ctx.ui.select=async(_title:string,options:string[])=>{selections++;if(selections>1)throw new Error('Retired continuation opened a second picker');return new Promise<string>(r=>{release=()=>r(options[0]!);});};const opening=f.ui.prepare('show','',f.ctx);void opening.catch(()=>{});await new Promise(r=>setImmediate(r));await f.ui.close();release('');await assert.rejects(opening,/retired/i);assert.equal(widgets,0);assert.equal(selections,1);
});
test('PR12 W3 close retires late native topology selection',async t=>{
 const f=await fixture(t);let release!:(value:string)=>void,sent=0;const ui=new PiPresentation({sendUserMessage:()=>{sent++;}} as any);ui.source=async()=>f.view;f.ctx.hasUI=true;f.ctx.isIdle=()=>true;f.ctx.ui.setWidget=()=>{};f.ctx.ui.select=async()=>new Promise<string>(r=>{release=r;});const opening=ui.prepare('show','old-live',f.ctx);void opening.catch(()=>{});await new Promise(r=>setImmediate(r));await ui.close();release('Native Fabric topology');await assert.rejects(opening,/retired/);assert.equal(sent,0);
});
test('PR12 W3 close retires browser request held before source resolution',async t=>{
 const f=await fixture(t);let release!:(v:SourceView)=>void,starts=0,notices=0;f.ui.source=async()=>new Promise(r=>{release=r;});f.ctx.ui.notify=()=>{notices++;};const original=ReadOnlyServer.start;ReadOnlyServer.start=async view=>{starts++;return original(view);};t.after(()=>{ReadOnlyServer.start=original;});const opening=f.ui.prepare('browser','old-live',f.ctx);void opening.catch(()=>{});await f.ui.close();release(f.view);await assert.rejects(opening,/retired/);assert.equal(starts,0);assert.equal(notices,0);
});
test('PR12 W3 listener startup is single-flight and close fences late handles',async t=>{
 const f=await fixture(t);let release!:(s:ReadOnlyServer)=>void,calls=0,closed=0;const original=ReadOnlyServer.start;ReadOnlyServer.start=async()=>{calls++;return new Promise(r=>{release=r;});};t.after(()=>{ReadOnlyServer.start=original;});const a=f.ui.prepare('browser','old-live',f.ctx),b=f.ui.prepare('browser','old-live',f.ctx);void a.catch(()=>{});void b.catch(()=>{});await new Promise(r=>setImmediate(r));assert.equal(calls,1);let settled=false;const closing=f.ui.close().then(()=>{settled=true;});await new Promise(r=>setImmediate(r));assert.equal(settled,false);release({view:f.view,url:'http://late',close:async()=>{closed++;}} as any);await closing;await Promise.allSettled([a,b]);assert.equal(closed,1);assert.equal(settled,true);
});
