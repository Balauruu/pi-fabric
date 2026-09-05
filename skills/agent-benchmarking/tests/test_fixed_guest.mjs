#!/usr/bin/env node
/** Exact-source guest mapping against an authoritative agents.run schema captured
 * with tools.describe({ref:'agents.run'}). No permissive Record request fake. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(root,'workflows/benchmark.ts'),'utf8');
const authoritativeSchema={"type":"object","properties":{"task":{"type":"string","description":"A self-contained task for the child agent"},"name":{"type":"string"},"runner":{"type":"string","enum":["pi","claude","veda"],"description":"Execution harness. Defaults to agents.runner."},"transport":{"type":"string","enum":["auto","process","tmux","screen","localterm","herdr"]},"model":{"type":"string","description":"Pi provider/id, a configured models.aliases name, or a search term resolved to the closest authenticated model (recency from pi-model-sort breaks ties); Claude runtime value or Veda backend model/alias are forwarded verbatim."},"persona":{"type":"string","description":"Veda persona name for this run, such as frontend, reviewer, worker, or a custom persona."},"thinking":{"type":"string","enum":["off","minimal","low","medium","high","xhigh","max"]},"tools":{"type":"array","items":{"type":"string"}},"timeoutMs":{"type":"number","description":"Optional longer wall-clock limit in milliseconds. Omit to use agents.timeoutMs (60 minutes by default); values below the configured default are ignored."},"extensions":{"type":"boolean"},"recursive":{"type":"boolean"},"cwd":{"type":"string","description":"Filesystem execution directory; relative paths resolve from the parent Fabric agent cwd."},"worktree":{"type":"boolean"},"schema":{"type":"object","description":"Optional JSON Schema for validated structured output"}},"required":["task"],"additionalProperties":false};
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const footer='const parsedRequest = exactRunRequest(JSON.parse(π.request));\nreturn await fixedBenchmarkRun(parsedRequest);';
const tools={describe:async()=>({inputSchema:authoritativeSchema})};
const helpers=await new AsyncFunction('agents','pi','π','tools',source.replace(footer,'return {fabricRequest, selectedCapabilityError, admitArguments};'))({run:async()=>({})},{},{},tools);
const job={workId:'a-1',request:{runner:'pi',model:'test/model',tools:[],prompt:'TASK',instructions:'FROZEN INSTRUCTION',settings:{}}};
function checkSchema(request) {
  for(const key of Object.keys(request)) assert.ok(Object.hasOwn(authoritativeSchema.properties,key),`unsupported public field: ${key}`);
  for(const key of authoritativeSchema.required) assert.ok(Object.hasOwn(request,key));
  for(const [key,value] of Object.entries(request)) {
    const field=authoritativeSchema.properties[key];
    if(field.enum) assert.ok(field.enum.includes(value),`unsupported ${key}: ${value}`);
  }
}
const mapped=helpers.fabricRequest(job);checkSchema(mapped);
assert.equal(mapped.task,'FROZEN INSTRUCTION\n\nTask:\nTASK');
for(const forbidden of ['prompt','instructions','residency']) assert.equal(Object.hasOwn(mapped,forbidden),false);
for(const label of [null,'malformed','0.0.1','999.999.999']) assert.equal(helpers.selectedCapabilityError(job,{agentsRun:true,nativeResult:true,versionLabel:label}),null);
for(const key of ['temperature','residency']) assert.match(helpers.selectedCapabilityError({...job,request:{...job.request,settings:{[key]:0}}},{}),new RegExp(key));
assert.match(helpers.selectedCapabilityError({...job,request:{...job.request,settings:{recursive:true,cwd:'/custom'}}},{}),/omit custom cwd/);
const args=helpers.admitArguments({specPath:'/spec',outputDirectory:'/run'},null,{agentsRun:true,nativeResult:true,requestSchema:authoritativeSchema});
assert.ok(args.includes('--fresh-invocation'));
for(const flag of ['requested-call-ceiling','configured-call-ceiling','usable-call-ceiling']) assert.ok(args.includes(`--${flag} 1`));
assert.ok(!args.includes('--configured-call-ceiling 100'));

const envelope=(status,token=null,jobs=[])=>({schemaVersion:1,public:{status},invocationToken:token,jobs});
let calls=0, probes=0, admissions=0;const publications=[];
const pi={
 async bash({command}) {
   let value;
   if(command.includes('internal-preflight')) value=envelope('checkpoint');
   else if(command.includes('internal-admit')) value=++admissions===1?envelope('checkpoint','token',[job]):envelope('complete');
   else value=envelope('checkpoint',command.includes('internal-checkpoint')?null:'token');
   return {ok:true,output:JSON.stringify(value),details:null};
 },
 async write(value){publications.push(JSON.parse(value.content));return {ok:true,output:'',details:null};}
};
const native={status:'timed_out',error:'native timeout',logFile:'/native/events.jsonl',usage:{input:4},thinking:'high'};
const execute=new AsyncFunction('agents','pi','π','tools',source);
assert.equal((await execute({run:async request=>{checkSchema(request);calls++;return native;}},pi,{request:JSON.stringify({specPath:'/spec',outputDirectory:'/run'})},{describe:async()=>{probes++;return {inputSchema:authoritativeSchema};}})).status,'complete');
assert.equal(calls,1);assert.equal(probes,1);assert.deepEqual(publications[0].native,native);
// Saved completion returns before discovery or dispatch.
const completedPi={bash:async()=>({ok:true,output:JSON.stringify(envelope('complete')),details:null})};
assert.equal((await execute({run:()=>{throw Error('dispatch forbidden');}},completedPi,{request:JSON.stringify({specPath:'/spec',outputDirectory:'/run'})},{describe:()=>{throw Error('backend check forbidden');}})).status,'complete');

// The public exact-source contract is a fresh dedicated invocation. The guest
// configures ONE call, the minimum positive outer agentBudget. It does not claim
// to know Fabric's maximum or support embedding after unrelated calls.
const admissionTemp=fs.mkdtempSync(path.join(root,'tests','.tmp-guest-admit-'));
try {
 const specPath=path.join(admissionTemp,'spec.json');
 const outputDirectory=path.join(admissionTemp,'run');
 fs.copyFileSync(path.join(root,'tests/fixtures/refactor/minimal-deterministic/spec.json'),specPath);
 let totalCalls=0, currentCalls=0;
 const localPi={
   bash:async({command})=>({ok:true,output:execFileSync('/bin/bash',['-c',command],{encoding:'utf8'}),details:null}),
   write:async({path:file,content})=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,content);return {ok:true,output:'',details:null};}
 };
 const native={run:async request=>{
   checkSchema(request); currentCalls++; totalCalls++;
   assert.ok(currentCalls<=1,'host one-call budget exceeded');
   return {id:`fake-${totalCalls}`,status:'completed',text:request.task.includes('2 and 3')?'5':'BLUE',usage:{input:1,output:1}};
 }};
 for(let invocation=0;invocation<4;invocation++) {
   currentCalls=0;
   const result=await execute(native,localPi,{request:JSON.stringify({specPath,outputDirectory})},tools);
   assert.equal(currentCalls,1);
   assert.equal(result.status,invocation===3?'complete':'checkpoint');
   assert.equal(result.counts.assigned,invocation+1);
   assert.equal(fs.existsSync(path.join(outputDirectory,'.run.lock')),false);
 }
 currentCalls=0;
 const completed=await execute(native,localPi,{request:JSON.stringify({specPath,outputDirectory})},
   {describe:()=>{throw Error('completed request checked backend');}});
 assert.equal(completed.status,'complete');assert.equal(currentCalls,0);assert.equal(totalCalls,4);
} finally {fs.rmSync(admissionTemp,{recursive:true,force:true});}

// Typecheck the exact source against declarations derived from the authoritative
// schema, rather than the installed loose guest aliases (which over-advertise fields).
function tsType(s){if(s.enum)return s.enum.map(x=>JSON.stringify(x)).join('|');return ({string:'string',number:'number',boolean:'boolean',array:'string[]',object:'Record<string,unknown>'})[s.type]||'unknown';}
const fields=Object.entries(authoritativeSchema.properties).map(([key,s])=>`${key}${authoritativeSchema.required.includes(key)?'':'?'}:${tsType(s)}`).join(';');
const temp=fs.mkdtempSync(path.join(root,'tests','.tmp-guest-'));
try {
 const file=path.join(temp,'guest.ts');
 fs.writeFileSync(file,`interface PublicAgentRequest {${fields}}\ndeclare const agents:{run(r:PublicAgentRequest):Promise<unknown>};\ndeclare const tools:{describe(r:{ref:string}):Promise<{inputSchema:unknown}>};\ndeclare const pi:{bash(r:{command:string}):Promise<{output:string}>;write(r:{path:string,content:string}):Promise<unknown>};\ndeclare const π:Record<string,string>;\nasync function guest(){${source}\n}`);
 execFileSync(path.resolve(root,'../../npm/node_modules/.bin/tsc'),['--noEmit','--target','ES2022','--module','ESNext','--skipLibCheck','--strict','false',file],{stdio:'pipe'});
} finally {fs.rmSync(temp,{recursive:true,force:true});}
console.log('fixed guest: authoritative request mapping, selected capabilities, native error preservation, completed zero-backend path, fresh one-call bound and four-invocation production bridge, exact-source typecheck passed');
