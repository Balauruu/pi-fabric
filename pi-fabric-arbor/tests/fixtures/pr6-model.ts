import { appendFileSync } from 'node:fs';
import { createServer } from 'node:http';
/** Local inference only. Edits are native worker tool calls; owner independently grades. */
export async function researchModel(trace:string){
 const server=createServer(async(req,res)=>{try{
  let input='';for await(const part of req){input+=String(part);if(input.length>2*1048576)throw new Error('fixture input bound');}
  const b=JSON.parse(input),text=b.messages.filter((m:any)=>m.role==='user').map((m:any)=>typeof m.content==='string'?m.content:(m.content??[]).filter((p:any)=>p.type==='text').map((p:any)=>p.text).join('\n')).join('\n');
  const worker=text.includes('Arbor bounded material worker'),didTool=b.messages.some((m:any)=>m.role==='tool');
  const level=Number(/PR6_LEVEL=(\d+)/.exec(text)?.[1]??0),attempt=/Attempt: (\S+)/.exec(text)?.[1]??'unknown';
  const path=text.includes('Mutable paths: ["program.cjs"]')?'program.cjs':'skills/fabric-arbor/roles/executor.md';
  const content=path==='program.cjs'?`module.exports={level:${level},score:${level===0?1:level===4?3:level===3?9:2}};`:`SUBJECT_ONLY PR6_SUBJECT_LEVEL=${level}`;
  const cwd=/Expected canonical cwd: ([^\n]+)/.exec(text)?.[1],oid=/Exact OID: ([^\n]+)/.exec(text)?.[1];
  const command=`test "$(git rev-parse --show-toplevel)" = ${JSON.stringify(cwd)} && test "$(git rev-parse HEAD)" = ${JSON.stringify(oid)} || exit 9; printf '${content}\\n' > ${path}; git add ${path}; git -c user.name=worker -c user.email=worker@example.invalid commit --allow-empty -m 'fixed hypothesis'`;
  const subjectLevel=Number(/PR6_SUBJECT_LEVEL=(\d+)/.exec(text)?.[1]??0), task=Number(/TASK_(\d+)/.exec(text)?.[1]??1);
  const good=subjectLevel===4 || (subjectLevel===3?task!==1:task===1 || (subjectLevel>0&&task===2));
  const delta=worker&&!didTool?{role:'assistant',tool_calls:[{index:0,id:'research-edit',type:'function',function:{name:'bash',arguments:JSON.stringify({command})}}]}:{role:'assistant',content:worker?JSON.stringify({sentinel:text.includes('PR6_FAIL_WORKERS')?'INVALID_WORKER_SENTINEL':'ARBOR_WORKER_RESULT_V1',attemptId:attempt,observations:'Fixed hypothesis edited and committed in the assigned worktree; all writers settled',paths:[path],limitations:'No scored feedback or informal diagnostic invocation; owner evaluation required'}):good?'GOOD':'BAD'};
  appendFileSync(trace,JSON.stringify({event:worker?'research.worker':'research.subject',data:{worker,didTool,level:worker?level:subjectLevel,task,model:b.model,tools:(b.tools??[]).map((t:any)=>t.function.name),revision:text.includes('PR6_EXPLICIT_REVISION'),bootstrap:text.includes('ARBOR_EXECUTOR_V1'),sentinel:text.includes('ARBOR_OPERATIONAL_BOOTSTRAP_V1'),attempt,cwd},at:Date.now()})+'\n');
  res.writeHead(200,{'Content-Type':'text/event-stream'});res.write(`data: ${JSON.stringify({id:'local-research',object:'chat.completion.chunk',created:1,model:b.model,choices:[{index:0,delta,finish_reason:null}]})}\n\n`);
  res.end(`data: ${JSON.stringify({id:'local-research',object:'chat.completion.chunk',created:1,model:b.model,choices:[{index:0,delta:{},finish_reason:worker&&!didTool?'tool_calls':'stop'}],usage:{prompt_tokens:2,completion_tokens:1,total_tokens:3}})}\n\ndata: [DONE]\n\n`);
 }catch(e){res.writeHead(500);res.end(String(e));}});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const a=server.address();if(!a||typeof a==='string')throw new Error('Missing local inference address');
 return{baseUrl:`http://127.0.0.1:${a.port}/v1`,close:()=>new Promise<void>((r,j)=>server.close(e=>e?j(e):r()))};
}
