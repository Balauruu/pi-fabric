import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { host } from '../fixtures/pr6-host.js';
import { pr8Provider } from '../fixtures/pr8-proposal.js';
import { researchModel } from '../fixtures/pr6-model.js';
import { commandProgram,researchCommand } from '../../src/research/commands.js';
const start=commandProgram(researchCommand('start',JSON.stringify({runId:'research'})));
const stages=[
 {stage:1,name:'reservation-no-spawn',file:'material/MaterialJourney.ts',anchor:'const preparedAt=Date.now();',condition:'true'},
 {stage:2,name:'spawn-return-before-attachment',file:'managed/OwnerExecution.ts',anchor:'const id = text(raw.id, "native worker ID");',condition:'true'},
 {stage:3,name:'worker-partial',file:'managed/OwnerExecution.ts',anchor:'if (attemptId) this.research!.native(spec.runId, attemptId, this.generation, { id, cwd: spec.cwd });',condition:'true',after:true},
 {stage:4,name:'finished-unfrozen',file:'material/MaterialJourney.ts',anchor:'const settledAt=Date.now();const failures:unknown[]=[];',condition:'true'},
 {stage:5,name:'frozen-unevaluated',file:'material/MaterialJourney.ts',anchor:'if (name === "evaluate") {',condition:'payload.attemptId!=="baseline"&&payload.attemptId!=="exact-material"',after:true},
 {stage:6,name:'evaluation-before-decision',file:'evaluators/EvaluationEngine.ts',anchor:'e.state = "completed"; this.store.saveEvaluation(e);',condition:'e.attemptId!==null',after:true},
 {stage:7,name:'ref-before-commit',file:'material/MaterialJourney.ts',anchor:'return this.store.completeIntegration(run.id, generation,',condition:'true'},
 {stage:8,name:'partial-source-apply',file:'material/SourceApply.ts',anchor:'this.#sync(dirname(file));',condition:'true',after:true},
 {stage:9,name:'reload-cleanup',file:'managed/OwnerExecution.ts',anchor:'run.draining = true;',condition:'run.journey&&reason==="interrupted"',after:true},
];
for(const s of stages)test(`PR8 SIGKILL gap ${s.stage} ${s.name}: reopen observes native provenance and blocks new owner without duplicate effects`,{timeout:180000},async t=>{
 let program=`const p=await(async()=>{${start}})();`;
 if(s.stage===8)program+=`await tools.call({ref:'arbor.apply',args:{runId:p.run.id,materialId:p.run.spec.source.materialId,epoch:p.run.epoch,revision:p.run.revision,commandId:'source-apply',decisionId:'pr8-keep'}});`;
 if(s.stage===9)program=`const active=(async()=>{${start}})();await Promise.race([tools.call({ref:'pr2fixture.ready',args:{}}),active.then(()=>{throw new Error('Native ask barrier missing')})]);const retired=components.reload({id:'arbor'});await tools.call({ref:'pr2fixture.release',args:{}});await retired;await active;`;
 program+='throw new Error("Required real crash boundary was not reached");';
 const h=await host('command',{sourceCopy:true,crash:s.stage,program,providerSource:await pr8Provider(),...(s.stage===8?{rpcResponses:['Apply exact source delta']}:{}),...(s.stage===9?{hold:'agents.ask'}:{}),inference:trace=>researchModel(trace,{...(s.stage===3?{partialHold:true}:{}),...(s.stage===8?{extraFile:true}:{})}),overrides:{objective:{description:'PR8 crash',unit:'points'},search:{maxActorTurns:32},limits:{attempts:1,evaluatorCalls:20,activeMs:600000},...(s.stage===8?{material:{mutablePaths:['program.cjs','extra'],evaluationInputs:['check'],selectedUntracked:['selected']}}:{})},prepare:async root=>{
  const path=join(root,'app/src',s.file),source=await readFile(path,'utf8');assert.equal(source.split(s.anchor).length,2,'unique crash boundary '+s.stage);
  const crash=s.stage===3?"await new Promise<void>((_resolve,reject)=>{const timer=setInterval(()=>{let partial;try{partial=pr8Read(spec.cwd+'/program.cjs','utf8');}catch{return;}if(partial.includes('PR8_PARTIAL_WRITE')){clearInterval(timer);clearTimeout(deadline);pr8Write(process.env.ARBOR_PR8_CRASH_FILE!,JSON.stringify({stage:3,pid:process.pid,at:Date.now(),nativeId:id,partial}));process.kill(process.pid,'SIGKILL');}},5);const deadline=setTimeout(()=>{clearInterval(timer);reject(new Error('Required native partial write not observed'));},20000);});":`if(${s.condition}){pr8Write(process.env.ARBOR_PR8_CRASH_FILE!,JSON.stringify({stage:${s.stage},pid:process.pid,at:Date.now()}));process.kill(process.pid,'SIGKILL');}`;
  await writeFile(path,"import {writeFileSync as pr8Write,readFileSync as pr8Read} from 'node:fs';\n"+source.replace(s.anchor,s.after?s.anchor+crash:crash+s.anchor));
 }});t.after(()=>h.store.close());
 assert.equal(h.value.stage,s.stage);assert.match(h.value.error,/Different native|Research resume intent owner unavailable/);const p=h.store.projection('research') as any;
 if(s.stage===1)assert.equal(p.attempts[0].nativeId,null);
 if(s.stage===2)assert.ok(h.events.some(e=>e.event==='native.result'&&e.data.ref==='agents.spawn'));
 if(s.stage===3){assert.equal(p.attempts[0].nativeDigest,null);assert.ok(p.attempts[0].nativeId&&p.attempts[0].state==='running');assert.match(await readFile(join(p.run.material.candidates[0].directory,'program.cjs'),'utf8'),/PR8_PARTIAL_WRITE/);}
 if(s.stage===4)assert.equal(p.run.material.candidates[0].oid,null);
 if(s.stage===5)assert.ok(p.run.material.candidates[0].oid&&p.evaluations.length===1);
 if(s.stage===6)assert.equal(p.evaluations.length,2);
 if(s.stage===7)assert.ok(p.run.material.pending);
 if(s.stage===8){const j=JSON.parse(await readFile(join(h.root,'state/runs/research/workspace/source-operations/source-apply.json'),'utf8'));assert.equal(j.state,'writing');assert.equal(await readFile(join(h.root,'source/extra'),'utf8'),'extra\n');assert.equal(j.intent.paths.length,2);}
 await mkdir('.runtime/pr8-gates',{recursive:true});await writeFile(`.runtime/pr8-gates/gap-${s.stage}.json`,JSON.stringify({root:h.root,stage:s.stage,name:s.name,value:h.value},null,2));
});
