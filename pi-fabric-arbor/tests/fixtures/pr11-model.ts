import {appendFileSync} from 'node:fs';
import {createServer} from 'node:http';
/** Inference outputs only. Installed owner runs native tools and independent graders. */
export async function exampleModel(trace:string){
 const server=createServer(async(req,res)=>{try{
  let input='';for await(const part of req){input+=String(part);if(input.length>2*1048576)throw new Error('bounded model input');}
  const b=JSON.parse(input),text=b.messages.filter((m:any)=>m.role==='user').map((m:any)=>typeof m.content==='string'?m.content:(m.content??[]).filter((p:any)=>p.type==='text').map((p:any)=>p.text).join('\n')).join('\n');
  const worker=text.includes('Arbor bounded material worker'),didTool=b.messages.some((m:any)=>m.role==='tool');
  const path=text.includes('unique.cjs')?'unique.cjs':text.includes('recipe.json')?'recipe.json':'prompt.md';
  const content=path==='unique.cjs'?'module.exports = values => [...new Set(values)];\n':path==='recipe.json'?'{"threshold":0}\n':'Classify the supplied integer. Return exactly POSITIVE for integers greater than 0, ZERO for 0, and NEGATIVE otherwise. Do not explain.\n';
  const attempt=/Attempt: (\S+)/.exec(text)?.[1],cwd=/Expected canonical cwd: ([^\n]+)/.exec(text)?.[1],oid=/Exact OID: ([^\n]+)/.exec(text)?.[1];
  const command=`test "$(git rev-parse --show-toplevel)" = ${JSON.stringify(cwd)} && test "$(git rev-parse HEAD)" = ${JSON.stringify(oid)} || exit 9; printf %b ${JSON.stringify(content)} > ${path}`;
  const number=Number(/Classify integer (-?\d+)/.exec(text)?.[1]);const threshold=text.includes('greater than 10')?10:0;
  const delta=worker&&!didTool?{role:'assistant',tool_calls:[{index:0,id:'example-edit',type:'function',function:{name:'bash',arguments:JSON.stringify({command})}}]}:{role:'assistant',content:worker?JSON.stringify({sentinel:'ARBOR_WORKER_RESULT_V1',attemptId:attempt,observations:'Changed only assigned material; native edit settled; independent evaluation required',paths:[path],limitations:'Local example only; no grade supplied'}):number===0?'ZERO':number>threshold?'POSITIVE':'NEGATIVE'};
  appendFileSync(trace,JSON.stringify({event:worker?'pr11.worker':'pr11.subject',data:{didTool,path,attempt,cwd,oid,number:Number.isFinite(number)?number:null,threshold,model:b.model,tools:(b.tools??[]).map((t:any)=>t.function.name),bootstrap:text.includes('ARBOR_EXECUTOR_V1')}})+'\n');
  res.writeHead(200,{'Content-Type':'text/event-stream'});res.write(`data: ${JSON.stringify({id:'local-example',object:'chat.completion.chunk',created:1,model:b.model,choices:[{index:0,delta,finish_reason:null}]})}\n\n`);
  res.end(`data: ${JSON.stringify({id:'local-example',object:'chat.completion.chunk',created:1,model:b.model,choices:[{index:0,delta:{},finish_reason:'tool_calls' in delta?'tool_calls':'stop'}],usage:{prompt_tokens:2,completion_tokens:1,total_tokens:3}})}\n\ndata: [DONE]\n\n`);
 }catch(e){res.writeHead(500);res.end(String(e));}});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const a=server.address();if(!a||typeof a==='string')throw new Error('Missing address');return {baseUrl:`http://127.0.0.1:${a.port}/v1`,close:()=>new Promise<void>((r,j)=>server.close(e=>e?j(e):r()))};
}
