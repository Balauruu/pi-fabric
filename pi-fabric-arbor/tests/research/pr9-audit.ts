import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,realpathSync,lstatSync,writeFileSync,statSync} from 'node:fs';
import {join,resolve,sep} from 'node:path';
import {ACTION_MANIFEST,canonical} from '../../src/research/contracts.js';
import {evaluationCalls} from '../../src/evaluators/contracts.js';
import {validationSchema} from '../../src/package.js';
const app=process.cwd(),gates=join(app,'.runtime/pr9-gates'),base='7a03483910d0d98e2ac1ee7feccbb295cf002482';
const read=(path:string)=>readFileSync(path,'utf8'),json=(path:string)=>JSON.parse(read(path));
function gate(name:string,counts:number[]){const text=read(join(gates,name+'.log'));assert.equal(read(join(gates,name+'.exit')).trim(),'0',name);assert.deepEqual([...text.matchAll(/ℹ tests (\d+)/g)].map(m=>Number(m[1])),counts,name);assert.deepEqual([...text.matchAll(/ℹ pass (\d+)/g)].map(m=>Number(m[1])),counts,name);for(const label of ['fail','cancelled','skipped'])assert.deepEqual([...text.matchAll(new RegExp('ℹ '+label+' (\\d+)','g'))].map(m=>Number(m[1])),counts.map(()=>0),name);return counts.reduce((a,b)=>a+b,0);}
const priorLocal={normal:gate('verified-normal',[5,92,20,46,45,80]),target:gate('verified-target',[13]),native:gate('final-pr9-native',[12])};
const normal=gate('review-normal',[5,92,20,46,45,84]),target=gate('review-target',[17]);
const native=Object.fromEntries([['review-pr9-native',13],['publication-pr9-native',13],['final-pr3-native',20],['regression-pr4-native',21],['final-pr5-native',9],['review-pr7-native',5],['review-pr6-native',21],['final-pr8-native',42],['repaired-pr6-budget-native',1]].map(([name,count])=>[name,gate(String(name),[Number(count)])]));
const pr6=read(join(gates,'regression-pr6-native.log'));assert.match(pr6,/ℹ pass 20/);assert.match(pr6,/ℹ fail 1/);assert.match(pr6,/✖ PR6 actual owner stops at evaluator-budget/);
const manifest=json(join(app,'docs/pr3-action-manifest.json'));assert.deepEqual(manifest.validationPolicy,validationSchema());for(const action of ACTION_MANIFEST)assert.equal(canonical(manifest.actions.find((a:any)=>a.ref===action.ref)),canonical(action));
const pkg=json(join(app,'package.json')),prior=JSON.parse(execFileSync('git',['show',`${base}:pi-fabric-arbor/package.json`],{encoding:'utf8'}));
for(const key of ['dependencies','devDependencies','peerDependencies','exports','bin','pi'])assert.deepEqual(pkg[key],prior[key],key);assert.equal(pkg.scripts['test:source:retained'],prior.scripts['test:source:retained']);assert.ok(pkg.scripts['test:pr9:e2e']);assert.ok(pkg.scripts['test:source'].includes('test:pr3')&&pkg.scripts['test:source'].includes('test:pr5'));
for(const path of ['node_modules','node_modules/pi-fabric','node_modules/@earendil-works/pi-coding-agent']){assert.equal(lstatSync(join(app,path)).isSymbolicLink(),false,path);assert.equal(realpathSync(join(app,path)),join(app,path));}
const unchanged=['package-lock.json','src/managed/OwnerExecution.ts','src/managed/RoleBundle.ts','src/managed/contracts.ts','src/material/Workspace.ts','src/material/SourceApply.ts','src/evaluators/material.ts','skills','web/read-only','tests/integration/pr7-parallel-host.test.ts','tests/git/fingerprint.test.ts'];
assert.equal(execFileSync('git',['diff',base,'--',...unchanged],{encoding:'utf8'}),'');
const raw=JSON.parse(execFileSync('npm',['pack','--dry-run','--ignore-scripts','--json'],{encoding:'utf8',maxBuffer:2*1048576}));const packed=Array.isArray(raw)?raw[0]:Object.values(raw)[0] as any;const paths=packed.files.map((f:any)=>f.path);
for(const path of ['src/evaluators/validation.ts','src/package.ts','docs/pr9-held-out-evidence.md','docs/pr3-action-manifest.json'])assert.ok(paths.includes(path),path);
assert.equal(paths.some((p:string)=>p.startsWith('.runtime/')||p.startsWith('tests/')||p.startsWith('dist/')),false);
for(const mode of [[],['--mode','attached'],['--mode','offline']]){let failed=false;try{execFileSync(process.execPath,['bin/pi-fabric-arbor.mjs','validate',...mode],{encoding:'utf8',stdio:'pipe'});}catch(e){const f=e as {status:number;stderr:string};assert.equal(f.status,2);assert.match(String(f.stderr),/strictly read-only/);failed=true;}assert.ok(failed);}
const latest=new Map<string,any>();for(const file of ['native-cases.jsonl','native-evidence.jsonl'])for(const line of read(join(gates,file)).trim().split('\n')){const entry=JSON.parse(line);latest.set(entry.name??'adaptive-'+entry.loser,entry);}
assert.equal(latest.size,13);let maxTraceBytes=0,maxEventBytes=0;
for(const entry of latest.values()){
 assert.ok(resolve(entry.root).startsWith(join(app,'.runtime')+sep));assert.deepEqual(json(join(entry.root,'exit.json')),{code:0,signal:null,killed:false,error:null});
 for(const record of entry.records)if(record.calls!==undefined)assert.equal(record.calls,evaluationCalls(json(join(entry.root,'state/runs/research/evaluations',record.id+'.json'))),record.id+' exact accounted calls');
 const trace=join(entry.root,'trace.jsonl'),bytes=statSync(trace).size;assert.ok(bytes<=2*1048576);maxTraceBytes=Math.max(maxTraceBytes,bytes);
 for(const line of read(trace).trim().split('\n'))maxEventBytes=Math.max(maxEventBytes,Buffer.byteLength(line));
}
assert.ok(maxEventBytes<=65536);
const a12=json(join(app,'.runtime/pr7-gates/a12.json')),serial=a12.results.find((r:any)=>r.concurrency===1),parallel=a12.results.find((r:any)=>r.concurrency===2);assert.equal(serial.warmed.length,3);assert.equal(parallel.warmed.length,3);assert.ok(parallel.warmed.every((w:any)=>w.overlap>0));assert.ok(parallel.median/serial.median<=.8);
const evidence={normal,target,native,priorLocal,pr6:'review full rerun 21/21; prior 20/21 plus repaired 1/1 retained as historical',nativeRoots:[...latest].map(([name,e])=>({name,root:e.root})),maxTraceBytes,maxEventBytes,packedFiles:paths.length,actions:manifest.actions.length,a12:{serialMs:serial.median,parallelMs:parallel.median,ratio:parallel.median/serial.median},dependencies:'physical app-local, declarations/lock unchanged',independentReview:'Main reviewed supplied diff; red/green scoped repairs verified',publication:'user-authorized conditional on separate full staged review and ordinary remote equality'};
writeFileSync(join(gates,'review-audit.json'),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify({...evidence,nativeRoots:evidence.nativeRoots.length}));
