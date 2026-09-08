import { appendFileSync } from 'node:fs';
import { createServer } from 'node:http';
/** Local inference only. Edits are native worker tool calls; owner independently grades. */
export async function researchModel(trace:string, options:{heldDelayMs?:number;judgeMalformedAt?:number;failAttempt?:string;extraFile?:boolean;partialHold?:boolean}={}){
 let judges=0;
 const server=createServer(async(req,res)=>{try{
  let input='';for await(const part of req){input+=String(part);if(input.length>2*1048576)throw new Error('fixture input bound');}
  const b=JSON.parse(input),text=b.messages.filter((m:any)=>m.role==='user').map((m:any)=>typeof m.content==='string'?m.content:(m.content??[]).filter((p:any)=>p.type==='text').map((p:any)=>p.text).join('\n')).join('\n');
  const worker=text.includes('Arbor bounded material worker'),didTool=b.messages.some((m:any)=>m.role==='tool');
  const level=Number(/PR6_LEVEL=(\d+)/.exec(text)?.[1]??0),attempt=/Attempt: (\S+)/.exec(text)?.[1]??'unknown';
  const path=/Mutable paths: \[[^\n]*"program\.cjs"/.test(text)?'program.cjs':'skills/fabric-arbor/roles/executor.md';
  const content=path==='program.cjs'?`module.exports={level:${level},score:${level===0?1:level===4?3:level===3?9:2}};`:`SUBJECT_ONLY PR6_SUBJECT_LEVEL=${level}`;
  const cwd=/Expected canonical cwd: ([^\n]+)/.exec(text)?.[1],oid=/Exact OID: ([^\n]+)/.exec(text)?.[1];
  const command=`test "$(git rev-parse --show-toplevel)" = ${JSON.stringify(cwd)} && test "$(git rev-parse HEAD)" = ${JSON.stringify(oid)} || exit 9; printf '${content}\\n' > ${path}; ${options.partialHold?"printf '// PR8_PARTIAL_WRITE\\n' >> program.cjs; sleep 5;":""} ${options.extraFile?"printf 'extra\\n' > extra; git add extra;":""} git add ${path}; git -c user.name=worker -c user.email=worker@example.invalid commit --allow-empty -m 'fixed hypothesis'`;
  const subjectLevel=Number(/PR6_SUBJECT_LEVEL=(\d+)/.exec(text)?.[1]??0), task=Number(/TASK_(\d+)/.exec(text)?.[1]??1);
  const good=subjectLevel===4 || (subjectLevel===3?task!==1:task===1 || (subjectLevel>0&&task===2));
  const judge=text.includes('Arbor bounded evaluation judge');if(judge)judges++;
  if(options.heldDelayMs&&!judge&&subjectLevel>0&&text.includes('HELD_OUT_DETAIL_SENTINEL'))await new Promise(r=>setTimeout(r,options.heldDelayMs));
  let delta=worker&&!didTool?{role:'assistant',tool_calls:[{index:0,id:'research-edit',type:'function',function:{name:'bash',arguments:JSON.stringify({command})}}]}:{role:'assistant',content:worker?JSON.stringify({sentinel:(text.includes('PR6_FAIL_WORKERS')||attempt===options.failAttempt)?'INVALID_WORKER_SENTINEL':'ARBOR_WORKER_RESULT_V1',attemptId:attempt,observations:'Fixed hypothesis edited and committed in the assigned worktree; all writers settled',paths:[path],limitations:'No scored feedback or informal diagnostic invocation; owner evaluation required'}):judge?(judges===options.judgeMalformedAt?'AMBIGUOUS':'PASS'):good?'GOOD':'BAD'};
  if(text.includes('ARBOR_LITERATURE_ASSIGNMENT_V1')){
   const assignment=JSON.parse(text.split('ARBOR_LITERATURE_ASSIGNMENT_V1\n')[1]!.split('\n')[0]!);
   const tools=b.messages.filter((m:any)=>m.role==='tool');const source=assignment.accesses[tools.length]??assignment.accesses[0];
   delta=tools.length<assignment.accesses.length?{role:'assistant',tool_calls:[{index:0,id:'literature-read-'+tools.length,type:'function',function:{name:'read',arguments:JSON.stringify({path:source.artifact.path})}}]}:{role:'assistant',content:JSON.stringify({sentinel:'ARBOR_LITERATURE_RESULT_V1',batchId:assignment.batchId,sources:assignment.accesses.map((a:any)=>({accessId:a.accessId,passage:'Caching avoids repeated parsing.',claim:'Try a bounded parser cache',limitations:'Source applicability requires local retesting'})),blocked:null})};
   appendFileSync(trace,JSON.stringify({event:'pr10.literature',data:{tools:(b.tools??[]).map((t:any)=>t.function.name),reads:tools.length,readContent:tools.map((m:any)=>m.content),model:b.model,cwd,bootstrap:text.includes('ARBOR_LITERATURE_V1'),evidence:text.includes('ARBOR_EVIDENCE_INTERPRETATION_V1'),collision:text.includes('CANDIDATE_LITERATURE_OVERRIDE'),bundle:/Bundle: (roles-\w+)/.exec(text)?.[1]}})+'\n');
  }
  appendFileSync(trace,JSON.stringify({event:worker?'research.worker':judge?'research.judge':'research.subject',data:{worker,didTool,level:worker?level:subjectLevel,task,model:b.model,tools:(b.tools??[]).map((t:any)=>t.function.name),revision:text.includes('PR6_EXPLICIT_REVISION'),bootstrap:text.includes('ARBOR_EXECUTOR_V1'),sentinel:text.includes('ARBOR_OPERATIONAL_BOOTSTRAP_V1'),attempt,cwd},at:Date.now()})+'\n');
  res.writeHead(200,{'Content-Type':'text/event-stream'});res.write(`data: ${JSON.stringify({id:'local-research',object:'chat.completion.chunk',created:1,model:b.model,choices:[{index:0,delta,finish_reason:null}]})}\n\n`);
  res.end(`data: ${JSON.stringify({id:'local-research',object:'chat.completion.chunk',created:1,model:b.model,choices:[{index:0,delta:{},finish_reason:'tool_calls' in delta?'tool_calls':'stop'}],usage:{prompt_tokens:2,completion_tokens:1,total_tokens:3}})}\n\ndata: [DONE]\n\n`);
 }catch(e){res.writeHead(500);res.end(String(e));}});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const a=server.address();if(!a||typeof a==='string')throw new Error('Missing local inference address');
 return{baseUrl:`http://127.0.0.1:${a.port}/v1`,close:()=>new Promise<void>((r,j)=>server.close(e=>e?j(e):r()))};
}
