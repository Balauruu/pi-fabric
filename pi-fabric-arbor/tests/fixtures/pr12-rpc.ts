import type {ChildProcess} from 'node:child_process';
export type RpcScript=(client:RpcJourney,root:string)=>Promise<void>;
/** Test client for the public Pi RPC JSONL protocol. No fake UI or owner calls. */
export class RpcJourney {
 readonly records:any[]=[];failure:string|undefined;
 #waiters=new Set<()=>void>();#sequence=0;
 constructor(readonly child:ChildProcess){let buffer='';child.stdout!.setEncoding('utf8');child.stdout!.on('data',data=>{buffer+=data;for(;;){const end=buffer.indexOf('\n');if(end<0)break;const line=buffer.slice(0,end);buffer=buffer.slice(end+1);try{this.records.push(JSON.parse(line));}catch{continue;}for(const wake of this.#waiters)wake();}});}
 send(value:unknown){this.child.stdin!.write(JSON.stringify(value)+'\n');}
 wait(predicate:(record:any)=>boolean,after=0,timeout=120000):Promise<any>{return new Promise((resolve,reject)=>{const check=()=>{const result=this.records.slice(after).find(predicate);if(result){clearTimeout(timer);this.#waiters.delete(check);resolve(result);}};const timer=setTimeout(()=>{this.#waiters.delete(check);reject(new Error('RPC event timeout: '+JSON.stringify(this.records.slice(-3)).slice(0,1500)));},timeout);this.#waiters.add(check);check();});}
 async command(message:string,respond?:(record:any)=>Record<string,unknown>,turn=true){const from=this.records.length,id='pr12-'+(++this.#sequence);const pump=()=>{for(const record of this.records.slice(from)){if(record.type==='extension_ui_request'&&['select','input','confirm','editor'].includes(record.method)&&!answered.has(record.id)){answered.add(record.id);this.send({type:'extension_ui_response',id:record.id,...(respond?.(record)??{cancelled:true})});}}};const answered=new Set<string>();this.#waiters.add(pump);try{this.send({id,type:'prompt',message});const response=await this.wait(r=>r.type==='response'&&r.id===id,from);if(!response.success)throw new Error('RPC command rejected: '+JSON.stringify(response));if(turn){const end=await this.wait(r=>r.type==='agent_settled'||r.type==='extension_error',from);if(end.type==='extension_error')throw new Error(end.error);}return this.records.slice(from);}finally{this.#waiters.delete(pump);}}
}
