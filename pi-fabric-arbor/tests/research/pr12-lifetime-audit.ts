import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,realpathSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,resolve,sep,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {manifest} from './export-manifest.js';
import {createArborOwnerComponent} from '../../src/managed/definitions.js';
import {createOwnerDrainComponent,OWNER_LIFETIME_ACTION,OWNER_LIFETIME_REF} from '../../src/managed/OwnerLifetime.js';
const app=process.cwd(),runtime=join(app,'.runtime'),design=join(runtime,'pr12-design'),gates=join(runtime,'pr12-gates');
const json=(path:string)=>JSON.parse(readFileSync(path,'utf8'));
const hash=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
function gate(name:string,counts:number[]){const text=readFileSync(join(gates,name+'.log'),'utf8');assert.equal(readFileSync(join(gates,name+'.exit'),'utf8').trim(),'0',name);for(const key of ['tests','pass','fail','cancelled','skipped','todo']){const values=text.split('\n').filter(l=>l.startsWith('ℹ '+key+' ')).map(l=>Number(l.split(' ').at(-1)));assert.deepEqual(values,['tests','pass'].includes(key)?counts:counts.map(()=>0),name+': '+key);}assert.equal(text.split('\n').filter(l=>l.startsWith('ℹ duration_ms ')).length,counts.length);}
gate('final-native-pr12',[35]);gate('current-final-native-pr2',[8]);gate('final-targeted-approved',[41]);gate('final-normal-approved',[5,92,36,120,45,93]);
assert.deepEqual(json(join(app,'docs/pr3-action-manifest.json')),manifest);
assert.equal(manifest.actions.length,21);assert.deepEqual(manifest.internalCapabilities,[{ref:OWNER_LIFETIME_REF,caller:'owning-Pi-managed-drain-component',commands:[],actorCommitment:false,acquisitionOnly:true,...OWNER_LIFETIME_ACTION}]);
assert.deepEqual(manifest.ownerProvides,createArborOwnerComponent().provides);assert.deepEqual(manifest.drainRequires,createOwnerDrainComponent().requires);assert.deepEqual(manifest.actorRequires,['agents.self']);assert.equal(manifest.ownerRequires.length,10);
const reachable=new Set<string>();function visit(path:string){path=resolve(path);if(reachable.has(path))return;assert.ok(path.startsWith(app+sep));reachable.add(path);const text=readFileSync(path,'utf8');for(const m of text.matchAll(/(?:from\s*|import\s*)["']([^"']+)["']/gu)){const ref=m[1]!;if(ref.startsWith('.'))visit(resolve(dirname(path),ref.replace(/\.js$/u,'.ts')));else if(ref.startsWith('pi-fabric'))assert.ok(['pi-fabric','pi-fabric/protocol'].includes(ref),'Private Fabric import: '+ref);}}
visit(join(app,'src/extension.ts'));assert.ok(reachable.has(join(app,'src/managed/OwnerLifetime.ts')));
const packRaw=JSON.parse(execFileSync('npm',['pack','--dry-run','--ignore-scripts','--json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));const pack:any=Array.isArray(packRaw)?packRaw[0]:Object.values(packRaw)[0];const packed=new Set(pack.files.map((f:any)=>f.path));for(const p of reachable)assert.ok(packed.has(p.slice(app.length+1)),p);
function rows(name:string){return readFileSync(join(gates,name+'.jsonl'),'utf8').trim().split('\n').map(line=>JSON.parse(line));}
function latest(name:string,key:(r:any)=>string){return [...new Map(rows(name).map(row=>[key(row),row])).values()];}
function clean(root:string){assert.ok(resolve(root).startsWith(runtime+sep));assert.equal(realpathSync(root),root);assert.deepEqual(json(join(root,'exit.json')),{code:0,signal:null,killed:false,error:null});}
const lifetime=latest('lifetime-reload',r=>`${r.installed}/${r.hold}`);assert.equal(lifetime.length,10);
for(const installed of [false,true])for(const hold of ['agents.create','agents.ask','agents.spawn','agents.wait','agents.stop']){
 const row=lifetime.find(r=>r.installed===installed&&r.hold===hold);assert.ok(row);clean(row.root);assert.equal(row.live,0);assert.equal(row.actualComponentReload,true);assert.equal(row.heldSettlement,true);assert.notEqual(row.state,'cleanup_pending');assert.equal(row.actors.length,1);
 const trace=readFileSync(join(row.root,'trace.jsonl'),'utf8').trim().split('\n').map(line=>JSON.parse(line));assert.equal(trace.filter(e=>e.event==='barrier.held'&&e.data.ref===hold).length,1);assert.equal(trace.filter(e=>e.event==='barrier.released'&&e.data.ref===hold).length,1);
 const native=trace.filter(e=>e.event==='native.result');assert.ok(native.some(e=>e.data.ref==='agents.create'&&e.data.result.id===row.actors[0]));assert.ok(native.some(e=>e.data.ref==='agents.stop'&&e.data.result.id===row.actors[0]&&e.data.result.status==='stopped'));
 for(const id of row.workers){assert.ok(native.some(e=>e.data.ref==='agents.spawn'&&e.data.result.id===id));assert.ok(native.some(e=>e.data.ref==='agents.wait'&&e.data.result.id===id&&['completed','failed','stopped','timed_out'].includes(e.data.result.status)));}
 if(installed){const installedRoot=join(row.root,'node_modules/pi-fabric-arbor');assert.equal(realpathSync(installedRoot),installedRoot);for(const source of reachable)assert.equal(hash(join(installedRoot,source.slice(app.length+1))),hash(source),'Installed current module: '+source);assert.deepEqual(json(join(installedRoot,'docs/pr3-action-manifest.json')),manifest);}
}
const full=latest('held-reload',r=>`${r.installed}/${r.hold}`).filter(r=>['agents.ask','agents.spawn'].includes(r.hold));assert.equal(full.length,4);for(const row of full){clean(row.root);assert.equal(row.active,0);assert.equal(row.actualReload,true);assert.equal(row.heldSettlement,true);}
const application=latest('component-reload',r=>String(r.installed));assert.equal(application.length,2);for(const row of application){clean(row.root);assert.equal(row.active,0);assert.ok(row.nativeId);assert.equal(row.actualComponentReload,true);}
const result={status:'PASS',scope:'Approved A02/A22/A26 and F2-F5 scoped lifetime; not full PR12 acceptance',nativeTests:35,priorNativeTests:8,targetedTests:41,managedTests:36,ordinaryRefs:21,scopedRefs:1,nativeRequirements:10,reachableModules:reachable.size,modules:Object.fromEntries([...reachable].map(p=>[p.slice(app.length+1),hash(p)])),roots:{lifetime:lifetime.map(r=>({root:r.root,installed:r.installed,hold:r.hold})),wholePi:full.map(r=>r.root),application:application.map(r=>r.root)},limits:['Whole-Pi held ask/spawn only','Application substrate held create/ask/spawn/wait/stop plus research held spawn','Internal-owner reload unsupported; no owner-only or dependency-driven replacement guarantee','No paid inference, host API changes, publication or PR13 deletion']};
writeFileSync(join(design,'approved-lifetime-audit.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,modules:undefined,roots:undefined}));
