import assert from 'node:assert/strict';
import test from 'node:test';
import {existsSync} from 'node:fs';
import {mkdir,mkdtemp,readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import type {FabricComponentContext,FabricInvocationContext,FabricProvider} from 'pi-fabric/protocol';
import {OwnerLifetime,createOwnerDrainComponent,OWNER_LIFETIME_REF,OWNER_LIFETIME_ACTION} from '../../src/managed/OwnerLifetime.js';
import {createArborComponent,createArborOwnerComponent} from '../../src/managed/definitions.js';
import {ARBOR_ACTIONS,ARBOR_OWNER_REFS} from '../../src/managed/contracts.js';
import {manifest} from '../research/export-manifest.js';
const invocation=Object.freeze({}) as FabricInvocationContext;
const gate=()=>{let resolve!:()=>void;return {promise:new Promise<void>(r=>resolve=r),release:()=>resolve()};};
async function fixture(t:test.TestContext,ready:()=>boolean=()=>true,failProvision?:string,call:FabricComponentContext['call']=async()=>{throw new Error('Unexpected native work');}){
 await mkdir('.runtime/pr12-unit',{recursive:true});const stateDirectory=join(await mkdtemp(resolve('.runtime/pr12-unit/lifetime-')),'state');
 const providers=new Map<string,FabricProvider>(),staged:FabricProvider[]=[],inverses:Array<()=>unknown>=[],controller=new AbortController();
 const context=Object.freeze({id:'arbor.owner',signal:controller.signal,invocation,call,provide(p:FabricProvider){providers.set(p.name,p);if(p.name===failProvision)throw new Error('staged provision failure');staged.push(p);},defer(fn:()=>unknown){inverses.push(fn);return fn;}}) as unknown as FabricComponentContext;
 let failure:unknown;try{await createArborOwnerComponent([],undefined,[],ready).activate(context,{stateDirectory});}catch(error){failure=error;}
 const dispose=async()=>{for(const fn of [...inverses].reverse())await fn();};
 t.after(async()=>{await dispose();for(const provider of staged)await provider.close!();});
 return {stateDirectory,providers,controller,context,failure,dispose,owner:providers.get('arbor')!,lifetime:providers.get('arbor_lifetime') as OwnerLifetime};
}
test('PR12 scoped capability is discoverable, closed, acquisition-only and absent from actor authority',async()=>{
 const p=new OwnerLifetime(async()=>{},()=>true),actions=await p.list({},invocation);assert.deepEqual(actions,[OWNER_LIFETIME_ACTION]);actions[0]!.name='mutated';assert.equal((await p.describe('lease',invocation))!.name,'lease');assert.equal(await p.describe('other',invocation),undefined);
 await assert.rejects(p.invoke('lease',{},invocation),/scoped acquisition/);await assert.rejects(p.acquire('other',{},invocation),/Invalid/);await assert.rejects(p.acquire('lease',{runId:'forged'},invocation),/Invalid/);
 assert.deepEqual(manifest.internalCapabilities,[{ref:OWNER_LIFETIME_REF,caller:'owning-Pi-managed-drain-component',commands:[],actorCommitment:false,acquisitionOnly:true,...OWNER_LIFETIME_ACTION}]);assert.deepEqual(JSON.parse(await readFile('docs/pr3-action-manifest.json','utf8')),manifest);
 assert.equal(manifest.actions.length,21);assert.deepEqual(manifest.actorRequires,['agents.self']);assert.deepEqual(manifest.ownerRequires,ARBOR_OWNER_REFS);assert.deepEqual(manifest.ownerProvides,createArborOwnerComponent().provides);assert.deepEqual(manifest.drainRequires,createOwnerDrainComponent().requires);
});
test('PR12 acquired lease is passive, fences synchronously and awaits one real drain',async()=>{
 let count=0,ready=true,done=false;const hold=gate(),p=new OwnerLifetime(async()=>{count++;await hold.promise;},()=>ready);assert.throws(()=>p.assertReady(),/this generation/);
 const lease=await p.acquire('lease',{},invocation);assert.equal(lease.value,null);assert.equal(count,0);p.assertReady();ready=false;
 const pending=lease.dispose().then(()=>{done=true;});assert.equal(count,1);assert.equal(done,false);ready=true;assert.throws(()=>p.assertReady(),/this generation/);await assert.rejects(p.acquire('lease',{},invocation),/unavailable/);hold.release();await pending;await lease.dispose();await p.dispose();assert.equal(count,1);
});
for(const synchronous of [false,true])test(`PR12 ${synchronous?'synchronous':'asynchronous'} drain failure stays cached and cannot revive admission`,async()=>{
 const failure=new Error('resource failure');let count=0;const p=new OwnerLifetime(()=>{count++;if(synchronous)throw failure;return Promise.reject(failure);},()=>true),lease=await p.acquire('lease',{},invocation);
 await assert.rejects(lease.dispose(),e=>e===failure);await assert.rejects(p.dispose(),e=>e===failure);assert.equal(count,1);assert.throws(()=>p.assertReady(),/this generation/);await p.close();await assert.rejects(p.acquire('lease',{},invocation),/unavailable/);
});
test('PR12 sibling topology is passive; the guard acquires only its declared resource',async()=>{
 const children:Array<{definition:any;options:any}>=[];
 await createArborComponent().activate({use(definition:any,options:any){children.push({definition,options});return{status:()=>({state:'waiting'})};},defer(){},call(){throw new Error('No parent native calls');}} as unknown as FabricComponentContext,{stateDirectory:resolve('.runtime/pr12-unit/topology')});
 assert.deepEqual(children.map(c=>c.options.id),['owner','drain']);assert.deepEqual(children[0]!.definition.requires,ARBOR_OWNER_REFS);const guard=children[1]!.definition;assert.deepEqual(guard.requires,[OWNER_LIFETIME_REF]);assert.deepEqual(guard.provides,[]);
 const calls:unknown[]=[];await guard.activate({async acquire(ref:string,args:unknown){calls.push([ref,args]);return null;},call(){throw new Error('No guard native calls');}},{});assert.deepEqual(calls,[[OWNER_LIFETIME_REF,{}]]);
});
for(const state of ['waiting','loading','failed','quarantined','unloading','disposed'])test(`PR12 ${state} guard blocks all mutation before native work or storage`,async t=>{
 let status=state;const f=await fixture(t,()=>status==='active');assert.equal(f.failure,undefined);await f.lifetime.acquire('lease',{},invocation);
 for(const a of ARBOR_ACTIONS.filter(a=>a.risk!=='read'))await assert.rejects(f.owner.invoke(a.name,{},invocation),/lifetime guard is not active/);
 assert.equal(await f.owner.invoke('inspect',{runId:'absent'},invocation),null);assert.equal(existsSync(f.stateDirectory),false);status='active';f.lifetime.assertReady();
});
test('PR12 replacement cannot borrow old active guard or revive released generation; storage survives lease release',async t=>{
 const old=await fixture(t),fresh=await fixture(t),lease=await old.lifetime.acquire('lease',{},invocation);old.lifetime.assertReady();await assert.rejects(fresh.owner.invoke('substrateStart',{},invocation),/this generation/);
 await lease.dispose();await fresh.lifetime.acquire('lease',{},invocation);fresh.lifetime.assertReady();await assert.rejects(old.owner.invoke('substrateStart',{},invocation),/this generation/);
 assert.equal(await old.owner.invoke('inspect',{runId:'absent'},invocation),null);await old.lifetime.close();assert.equal(await old.owner.invoke('inspect',{runId:'absent'},invocation),null);await old.owner.close!();await assert.rejects(old.owner.invoke('inspect',{runId:'absent'},invocation),/storage is closed/);
});
test('PR12 landed acquisition diversion drains once and cannot be reacquired',async t=>{
 const f=await fixture(t,()=>false);let landed:Awaited<ReturnType<OwnerLifetime['acquire']>>|undefined;
 await assert.rejects(async()=>{await createOwnerDrainComponent().activate({async acquire(ref:string,args:Record<string,unknown>){assert.equal(ref,OWNER_LIFETIME_REF);landed=await f.lifetime.acquire('lease',args,invocation);throw new Error('target diverted');}} as unknown as FabricComponentContext,{});},/target diverted/);
 assert.throws(()=>f.lifetime.assertReady(),/this generation/);await landed!.dispose();await assert.rejects(f.lifetime.acquire('lease',{},invocation),/unavailable/);assert.equal(f.controller.signal.aborted,false);assert.equal(await f.owner.invoke('inspect',{runId:'absent'},invocation),null);
});
for(const provision of ['arbor','arbor_lifetime'])test(`PR12 partial ${provision} activation keeps storage ownership explicit`,async t=>{
 const f=await fixture(t,()=>true,provision);assert.match(String(f.failure),/staged provision failure/);await f.dispose();
 if(provision==='arbor')await assert.rejects(f.owner.invoke('inspect',{runId:'absent'},invocation),/storage is closed/);
 else{assert.equal(await f.owner.invoke('inspect',{runId:'absent'},invocation),null);await f.owner.close!();await assert.rejects(f.owner.invoke('inspect',{runId:'absent'},invocation),/storage is closed/);}
 assert.equal(existsSync(f.stateDirectory),false);assert.equal(f.controller.signal.aborted,false);
});
test('PR12 post-await identity admission rejects after scoped drain without persistence or dispatch',async t=>{
 const entered=gate(),hold=gate(),native={id:'root',rootId:'root',kind:'root',ownerHostId:'host',ownerIdentityId:'owner',sessionId:'session',local:true,stale:false};
 const f=await fixture(t,()=>true,undefined,async ref=>{assert.equal(ref,'agents.self');entered.release();await hold.promise;return native;});const lease=await f.lifetime.acquire('lease',{},invocation);
 const ctx={cwd:f.stateDirectory,extensionContext:{sessionManager:{getSessionId:()=> 'session'},isProjectTrusted:()=>true,model:{provider:'fake',id:'local'},modelRegistry:{getAvailable:()=>[{provider:'fake',id:'local'}]}}} as unknown as FabricInvocationContext;
 const pending=f.owner.invoke('start',{runId:'pending',overrides:{execution:'deferred',material:{kind:'instructions'}}},ctx);void pending.catch(()=>{});await entered.promise;
 let done=false;const disposal=lease.dispose().then(()=>{done=true;});assert.equal(done,false);hold.release();await assert.rejects(pending,/draining/);await disposal;assert.equal(existsSync(f.stateDirectory),false);assert.equal(f.controller.signal.aborted,false);
});
