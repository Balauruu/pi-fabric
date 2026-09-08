import assert from 'node:assert/strict';
import test from 'node:test';
import {fork} from 'node:child_process';
import {once} from 'node:events';
import {DatabaseSync} from 'node:sqlite';
import {mkdtemp,mkdir,readFile,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {ResearchStore} from '../../src/research/ResearchStore.js';
import {resolveSpec} from '../../src/research/spec.js';
async function fixture(t:test.TestContext){await mkdir('.runtime/pr12-unit',{recursive:true});const root=await mkdtemp(resolve('.runtime/pr12-unit/storage-')),path=join(root,'research.sqlite3');const store=new ResearchStore(path),spec=await resolveSpec(root,{},{},{execution:'deferred'},'fake/model');store.create({id:'run',spec,requestHash:'r',owner:{id:'root',rootId:'root',ownerHostId:'host',ownerIdentityId:'owner',sessionId:'session'},componentId:'arbor.owner',generation:'g',epoch:'epoch-1',revision:0,state:'ready',attemptsUsed:0,active:0,createdAt:1,activeMs:0,activeSince:null,steering:[],pendingDecisionId:null,execution:'not-started',error:null});store.close();const db=new DatabaseSync(path);db.exec("CREATE TABLE user_data(value TEXT); INSERT INTO user_data VALUES('committed')");db.close();const owner=new ResearchStore(path);t.after(()=>owner.close());return{root,path,owner};}
async function child(path:string,mode:string){const p=fork(resolve('tests/fixtures/pr12-storage-worker.ts'),[path,mode],{execArgv:['--import','tsx'],stdio:['ignore','ignore','pipe','ipc']});await once(p,'message');return p;}
function user(path:string){const db=new DatabaseSync(path,{readOnly:true});try{return db.prepare('SELECT value FROM user_data').get()!.value;}finally{db.close();}}
test('PR12 W1 reopening current owner storage preserves every byte and inventory before mutation',async t=>{
 const f=await fixture(t),before=await readFile(f.path),files=await readdir(f.root);
 for(let i=0;i<2;i++){const owner=new ResearchStore(f.path);try{owner.prepareOwner();assert.equal(owner.get('run')!.state,'ready');assert.deepEqual(await readFile(f.path),before);assert.deepEqual(await readdir(f.root),files);}finally{owner.close();}assert.deepEqual(await readFile(f.path),before);assert.deepEqual(await readdir(f.root),files);}
});
test('PR12 W1 owner quiescent WAL transition retains committed user data and cold bytes',async t=>{const f=await fixture(t),p=await child(f.path,'wal-committed'),exiting=once(p,'exit');p.kill('SIGKILL');await exiting;assert.ok((await readFile(f.path+'-wal')).includes(Buffer.from('WAL committed')));assert.ok(!(await readFile(f.path)).includes(Buffer.from('WAL committed')));const coldBytes=await readFile(f.path),coldFiles=await readdir(f.root);assert.throws(()=>f.owner.get('run'),/Read-only WAL projection unavailable/);assert.deepEqual(await readFile(f.path),coldBytes);assert.deepEqual(await readdir(f.root),coldFiles);f.owner.prepareOwner();f.owner.control(f.owner.binding(f.owner.get('run')!,'pause'),'g','pause');f.owner.close();const before=await readFile(f.path),files=await readdir(f.root),reader=new ResearchStore(f.path);assert.equal(reader.get('run')!.state,'paused');assert.equal(user(f.path),'WAL committed');reader.close();assert.deepEqual(await readFile(f.path),before);assert.deepEqual(await readdir(f.root),files);});
test('PR12 W1 live rollback reader and writer serialize complete transactions',async t=>{const f=await fixture(t),p=await child(f.path,'writer');const exiting=once(p,'exit');assert.equal(user(f.path),'committed');assert.equal(f.owner.get('run')!.state,'ready');p.send('commit');await exiting;assert.equal(user(f.path),'uncommitted');f.owner.control(f.owner.binding(f.owner.get('run')!,'pause'),'g','pause');assert.equal(f.owner.get('run')!.state,'paused');});
test('PR12 W1 busy WAL owner refuses conversion without losing active transaction',async t=>{const f=await fixture(t),db=new DatabaseSync(f.path);db.exec('PRAGMA journal_mode=WAL');const p=await child(f.path,'writer'),exiting=once(p,'exit');try{assert.throws(()=>f.owner.prepareOwner(),/busy|locked|quiescent/i);assert.equal(user(f.path),'committed');}finally{p.send('commit');await exiting;db.close();}assert.equal(user(f.path),'uncommitted');f.owner.prepareOwner();f.owner.control(f.owner.binding(f.owner.get('run')!,'pause'),'g','pause');assert.equal(user(f.path),'uncommitted');});
test('PR12 W1 pinned WAL reader blocks transition until its snapshot settles',async t=>{const f=await fixture(t),db=new DatabaseSync(f.path);db.exec('PRAGMA journal_mode=WAL');const p=await child(f.path,'reader'),exiting=once(p,'exit');db.exec("UPDATE user_data SET value='after reader'");try{assert.throws(()=>f.owner.prepareOwner(),/busy|locked|quiescent/i);assert.equal(user(f.path),'after reader');}finally{p.send('release');await exiting;db.close();}f.owner.prepareOwner();assert.equal(user(f.path),'after reader');});
test('PR12 W1 journal switch between header and SQLite admission cannot create reader sidecars',async t=>{
 const f=await fixture(t),original=DatabaseSync.prototype.exec;let afterSwitch:Array<[string,string]>|undefined;DatabaseSync.prototype.exec=function(sql:string){if(sql==='PRAGMA busy_timeout=5000; BEGIN'){DatabaseSync.prototype.exec=original;const writer=new DatabaseSync(f.path);writer.exec('PRAGMA journal_mode=WAL');writer.close();afterSwitch=requireFiles();}return original.call(this,sql);};
 const {readdirSync,readFileSync}=await import('node:fs'),{createHash}=await import('node:crypto');const requireFiles=()=>readdirSync(f.root).sort().map(p=>[p,createHash('sha256').update(readFileSync(join(f.root,p))).digest('hex')] as [string,string]);const reader=new ResearchStore(f.path);try{try{reader.get('run');}catch(error){assert.match(String(error),/WAL|read-only|readonly/);}assert.ok(afterSwitch,'Interleaving did not execute');assert.deepEqual(requireFiles(),afterSwitch,'Reader changed database or sidecar bytes/inventory after external mode transition');}finally{DatabaseSync.prototype.exec=original;reader.close();}
});
test('PR12 W1 cold reader locking is disposable and never changes owner locking',async t=>{
 const f=await fixture(t),original=DatabaseSync.prototype.exec,cold=new Set<DatabaseSync>();
 DatabaseSync.prototype.exec=function(sql:string){if(sql==='PRAGMA locking_mode=EXCLUSIVE')cold.add(this);return original.call(this,sql);};
 try{
  assert.equal(f.owner.get('run')!.state,'ready');assert.equal(cold.size,1);
  assert.ok([...cold].every(db=>!db.isOpen),'Cold read retained its connection');
  f.owner.prepareOwner();assert.equal(f.owner.get('run')!.state,'ready');
  assert.equal(cold.size,1,'Owner connection received cold-reader locking policy');
 }finally{DatabaseSync.prototype.exec=original;}
});
test('PR12 W1 admission failure before BEGIN preserves the original error and closes the reader',async t=>{
 const f=await fixture(t),original=DatabaseSync.prototype.exec,failure=new Error('injected admission failure');let reader:DatabaseSync|undefined;
 DatabaseSync.prototype.exec=function(sql:string){if(sql==='PRAGMA busy_timeout=5000; BEGIN'){reader=this;throw failure;}return original.call(this,sql);};
 try{assert.throws(()=>f.owner.get('run'),error=>error===failure);assert.ok(reader);assert.equal(reader.isOpen,false);}
 finally{DatabaseSync.prototype.exec=original;}
 assert.equal(f.owner.get('run')!.state,'ready','Failure left a hidden connection or transaction');
});
test('PR12 W1 crash rolls back uncommitted bytes and preserves committed user data',async t=>{const f=await fixture(t),run=f.owner.get('run')!,original=await readFile(f.path),p=await child(f.path,'crash'),exiting=once(p,'exit');assert.notDeepEqual(await readFile(f.path),original,'Crash fixture must spill dirty DB pages');assert.equal((await readFile(f.path+'-journal')).subarray(0,8).toString('hex'),'d9d505f920a163d7','Crash fixture must retain a hot journal');p.kill('SIGKILL');await exiting;const before=await readFile(f.path),files=await readdir(f.root),reader=new ResearchStore(f.path);try{assert.throws(()=>reader.get('run'),/readonly|read-only|locked/i);}finally{reader.close();}assert.deepEqual(await readFile(f.path),before);assert.deepEqual(await readdir(f.root),files);f.owner.control(f.owner.binding(run,'pause'),'g','pause');assert.equal(user(f.path),'committed');assert.equal(f.owner.get('run')!.state,'paused');});
