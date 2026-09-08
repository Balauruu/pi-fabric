import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile,writeFile,readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { ResearchStore } from '../../src/research/ResearchStore.js';
import { canonical,digest } from '../../src/research/contracts.js';
import { commandProgram,researchCommand } from '../../src/research/commands.js';
const exec=promisify(execFile);
/** Real process death, then another actual Pi host. No invented portable owner.
 * The new host must observe and reject, retaining all original facts. */
export async function reopenAfterCrash(input:{root:string;cwd:string;modules:string;fabric:string;fake:string;env:NodeJS.ProcessEnv;stage:number;exit:any}) {
 const {root,cwd,modules,fabric,fake,env,stage,exit}=input;
 assert.equal(exit.code,null,root);assert.equal(exit.signal,'SIGKILL',root);assert.equal(exit.killed,false,root);assert.ok(exit.error);
 const marker=JSON.parse(await readFile(join(root,'crash.json'),'utf8'));assert.equal(marker.stage,stage,root);
 const store=new ResearchStore(join(root,'state/research.sqlite3')),before=store.projection('research')!,snapshot=canonical(before),trace=join(root,'trace.jsonl');
 const databaseBytes=await readFile(store.path),inventory=(await readdir(join(root,'state'))).sort();
 const priorEvents=(await readFile(trace,'utf8')).trim().split('\n').map(l=>JSON.parse(l));
 const ids=priorEvents.filter(e=>e.event==='native.result'&&['agents.create','agents.spawn'].includes(e.data.ref)).map(e=>e.data.result.id).filter(Boolean);
 const resume=commandProgram(researchCommand('resume','research'));
 const program=`const p=await tools.call({ref:'arbor.inspect',args:{runId:'research'}}),self=await agents.self(),observations=[];for(const id of ${JSON.stringify(ids)}){try{observations.push({id,value:await agents.status({id})})}catch(e){observations.push({id,error:String(e)})}}let error;try{await(async()=>{${resume}})()}catch(e){error=String(e)}const denials=[];for(const ref of ['arbor.apply','arbor.undoApply','arbor.review']){try{await tools.call({ref,args:{runId:p.run.id,materialId:p.run.spec.source.materialId,epoch:p.run.epoch,revision:p.run.revision,commandId:'outside-owner-'+ref,decisionId:'source-apply'}});throw new Error('Mutation wrongly admitted')}catch(e){denials.push({ref,error:String(e)})}}return JSON.stringify({error,denials,self,observations,owner:p.run.owner,revision:p.run.revision,state:p.run.state,active:p.run.active});`;
 const reopened=exec(join(modules,'.bin/pi'),['--approve','--offline','--no-session','--no-skills','--no-prompt-templates','--no-themes','--provider','arbor-pr2-fake','--model','deterministic','--thinking','off','-e',fabric,'-e',fake,'--mode','json','-p','Observe retained PR8 crash; never adopt another native owner'],{cwd,env:{...env,ARBOR_PR2_PROGRAM:program},timeout:90000,maxBuffer:2*1048576});reopened.child.stdin?.end();let failure:any;
 const out=await reopened.catch(e=>{failure=e;return {stdout:e.stdout??'',stderr:e.stderr??String(e)}});
 const reopenedExit={code:reopened.child.exitCode,signal:reopened.child.signalCode,killed:reopened.child.killed,error:failure?.message??null};
 await Promise.all([writeFile(join(root,'reopen-stdout.log'),out.stdout),writeFile(join(root,'reopen-stderr.log'),out.stderr),writeFile(join(root,'reopen-exit.json'),JSON.stringify(reopenedExit))]);
 assert.deepEqual(reopenedExit,{code:0,signal:null,killed:false,error:null},root);
 const events=(await readFile(trace,'utf8')).trim().split('\n').map(l=>JSON.parse(l)),value=JSON.parse(events.filter(e=>e.event==='main.result').at(-1).data);
 assert.match(value.error,/Different native|Research resume intent owner unavailable/);assert.notEqual(value.self.ownerHostId,value.owner.ownerHostId);assert.equal(value.denials.length,3);for(const d of value.denials)assert.match(d.error,/Different native/);assert.equal(canonical(store.projection('research')),snapshot);assert.deepEqual(await readFile(store.path),databaseBytes);assert.deepEqual((await readdir(join(root,'state'))).sort(),inventory);
 const count=(es:any[])=>es.filter(e=>e.event==='native.result'&&['agents.create','agents.spawn'].includes(e.data.ref)).length;assert.equal(count(events),count(priorEvents));
 await writeFile(join(root,'crash-observation.json'),JSON.stringify({stage,marker,exit,reopenedExit,projectionDigest:digest(before),nativeEffects:count(events),value},null,2));
 return {root,store,events,value:{...value,stage,nativeEffects:count(events),projectionDigest:digest(before)}};
}
