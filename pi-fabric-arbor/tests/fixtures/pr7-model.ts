import { appendFileSync } from 'node:fs';
import { createServer } from 'node:http';
/** Inference chooses proposals only. Production owner dispatches, collects and grades. */
export function parallelProposal(data:any){
 const p:any={version:2,runId:data.runId,materialId:data.materialId,epoch:data.epoch,revision:data.revision,commandId:data.commandId,expectedEvidence:[],estimatedBudget:{attempts:0,evaluatorCalls:0},rationale:'Compare two independent fixed hypotheses from the same incumbent'};
 const set=(kind:string,payload:any)=>Object.assign(p,{kind,payload});
 if(!data.nodes.length)return set('propose',{nodeId:'direction',type:'direction',parentId:null,title:'Independent exact code alternatives',rationale:'Test independent fixed one-second executors',sourceRefs:[]});
 const group=Math.floor(data.attempts.filter((a:any)=>data.ancestors.some((l:any)=>l.nodeId===a.nodeId)).length/2),target=Math.min(8,2*group+2);
 for(let n=1;n<=target;n++)if(!data.nodes.some((x:any)=>x.nodeId==='h'+n)&&!data.attempts.some((x:any)=>x.nodeId==='h'+n))return set('propose',{nodeId:'h'+n,type:'hypothesis',parentId:'direction',title:'Independent alternative '+n,rationale:'PR7_LEVEL='+n+'; fixed one-second workload, edit only program.cjs',sourceRefs:[]});
 const pending=data.nodes.filter((n:any)=>n.type==='hypothesis'&&!data.attempts.some((a:any)=>a.nodeId===n.nodeId));
 if(pending.length){
  const first=pending.find((n:any)=>data.selection.eligible.some((e:any)=>e.nodeId===n.nodeId));
  const picks=[{nodeId:first.nodeId,attemptId:first.nodeId,selection:{...data.selection.eligible.find((e:any)=>e.nodeId===first.nodeId),reason:'Test independent candidate in this eligible slot'}}];
  if(pending.length>1){const next=data.selectionAfter[first.nodeId],second=pending.find((n:any)=>n.nodeId!==first.nodeId&&next.eligible.some((e:any)=>e.nodeId===n.nodeId));picks.push({nodeId:second.nodeId,attemptId:second.nodeId,selection:{...next.eligible.find((e:any)=>e.nodeId===second.nodeId),reason:'Independent sibling fixed to the same incumbent'}});}
  p.estimatedBudget.attempts=picks.length;return set('dispatch',{waveId:'wave-'+picks.map(p=>p.nodeId).join('-'),candidates:picks});
 }
 const pair=data.attempts.slice(-2);
 for(const a of pair){const fact=data.recentFacts.find((f:any)=>f.attemptId===a.id);if(!fact?.evaluationId){p.estimatedBudget.evaluatorCalls=data.budgets.evaluationCapacity;return set('evaluate',{attemptId:a.id,evaluationId:'eval-'+a.id});}}
 const ranked=data.rankings.filter((r:any)=>pair.some((a:any)=>a.id===r.attemptId));
 for(const rankedItem of ranked){const a=pair.find((a:any)=>a.id===rankedItem.attemptId);if(!data.decisions.some((d:any)=>d.nodeId===a.nodeId&&['keep','discard'].includes(d.decision))){const e=data.evidence.find((e:any)=>e.id===rankedItem.evaluationId);const keep=ranked[0]===rankedItem&&JSON.parse(e.analysis).wins>0;p.expectedEvidence=[e.id];return set('decide',{decisionId:'decision-'+a.id,nodeId:a.nodeId,decision:keep?'keep':'discard',evidenceIds:[e.id]});}}
 for(const a of pair)if(!data.ancestors.some((l:any)=>l.nodeId===a.nodeId)){const e=data.recentFacts.find((f:any)=>f.attemptId===a.id).evaluationId;p.expectedEvidence=[e];return set('distill',{lessonId:'lesson-'+a.id,nodeId:a.nodeId,insight:'Independent exact alternative measured by the owner',limitations:'Local deterministic workload, not research quality or general speedup',evidenceIds:[e]});}
 return set('decide',{decisionId:'done',nodeId:null,decision:'stop',evidenceIds:[]});
}
export async function parallelModel(trace:string,protectedAttempt?:string){
 const server=createServer(async(req,res)=>{try{
  let input='';for await(const chunk of req)input+=String(chunk);const b=JSON.parse(input);
  const text=b.messages.filter((m:any)=>m.role==='user').map((m:any)=>typeof m.content==='string'?m.content:m.content.filter((p:any)=>p.type==='text').map((p:any)=>p.text).join('\n')).join('\n');
  const didTool=b.messages.some((m:any)=>m.role==='tool'),attempt=/Attempt: (\S+)/.exec(text)![1],level=Number(/PR7_LEVEL=(\d+)/.exec(text)![1]),cwd=/Expected canonical cwd: ([^\n]+)/.exec(text)![1],oid=/Exact OID: ([^\n]+)/.exec(text)![1];
  const command=`test "$(git rev-parse --show-toplevel)" = ${JSON.stringify(cwd)} && test "$(git rev-parse HEAD)" = ${JSON.stringify(oid)} || exit 9; node -e 'const fs=require("fs");fs.writeFileSync(${JSON.stringify(cwd+"-workload-start")},String(Date.now()));Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,1000);fs.writeFileSync(${JSON.stringify(cwd+"-workload-end")},String(Date.now()));fs.writeFileSync("program.cjs", "module.exports={level:0,score:${level+1}};\\n")'`;
  const protectedCommand=attempt===protectedAttempt?`; printf 'PROTECTED WORKER CHANGE' > check; git add check; git -c user.name=worker -c user.email=worker@example.invalid commit -m protected`:'';
  const delta=!didTool?{role:'assistant',tool_calls:[{index:0,id:'edit',type:'function',function:{name:'bash',arguments:JSON.stringify({command:command+protectedCommand})}}]}:{role:'assistant',content:JSON.stringify({sentinel:'ARBOR_WORKER_RESULT_V1',attemptId:attempt,observations:'Fixed one-second executor settled',paths:['program.cjs'],limitations:'Local deterministic inference; owner grading required'})};
  // Workload timestamps are read before production restore removes untracked diagnostics.
  const {readFileSync}=await import('node:fs');let interval=null;if(didTool)interval={start:Number(readFileSync(cwd+'-workload-start','utf8')),end:Number(readFileSync(cwd+'-workload-end','utf8'))};
  appendFileSync(trace,JSON.stringify({event:'pr7.worker',at:Date.now(),data:{didTool,attempt,cwd,oid,interval,tools:(b.tools??[]).map((t:any)=>t.function.name),bootstrap:text.includes('ARBOR_EXECUTOR_V1'),sentinel:text.includes('ARBOR_OPERATIONAL_BOOTSTRAP_V1')}})+'\n');
  res.writeHead(200,{'Content-Type':'text/event-stream'});res.write(`data: ${JSON.stringify({id:'local',object:'chat.completion.chunk',created:1,model:b.model,choices:[{index:0,delta,finish_reason:null}]})}\n\n`);res.end(`data: ${JSON.stringify({id:'local',object:'chat.completion.chunk',created:1,model:b.model,choices:[{index:0,delta:{},finish_reason:didTool?'stop':'tool_calls'}]})}\n\ndata: [DONE]\n\n`);
 }catch(e){res.writeHead(500);res.end(String(e));}});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const address=server.address() as {port:number};return {baseUrl:`http://127.0.0.1:${address.port}/v1`,close:()=>new Promise<void>((r,j)=>server.close(e=>e?j(e):r()))};
}
