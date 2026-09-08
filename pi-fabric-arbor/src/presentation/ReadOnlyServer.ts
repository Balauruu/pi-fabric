import {createServer,type ServerResponse} from 'node:http';
import type {AddressInfo} from 'node:net';
import {SourceWebAssets,type SourceWebAsset} from '../web/SourceWebAssets.js';
import {SourceView} from './SourceView.js';
/** A conventional session-owned listener. Its entire capability is SourceView.
 * No supplied callback can reach the owner or a remote provider. */
export class ReadOnlyServer {
  readonly #streams=new Set<ServerResponse>();
  readonly #timers=new Set<ReturnType<typeof setInterval>>();
  readonly #server;
  #url='';
  private constructor(readonly view:SourceView,readonly assets:SourceWebAssets){
    this.#server=createServer((request,response)=>{
      const send=(status:number,body:unknown,type='application/json; charset=utf-8')=>{response.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store'});response.end(Buffer.isBuffer(body)||body instanceof Uint8Array?body:typeof body==='string'?body:JSON.stringify(body));};
      if(request.method!=='GET'){response.setHeader('Allow','GET');send(405,{error:'Read-only browser; use the owning Pi for effects'});return;}
      void (async()=>{
        const url=new URL(request.url??'/','http://localhost');
        const routes:Record<string,string[]>={'/api/runs':[],'/api/projection':['run'],'/api/replay':['run'],'/api/events':['run'],'/api/diff':['run','attempt','revision'],'/api/artifact':['run','id']};
        const allowed=routes[url.pathname]??(url.pathname==='/'||url.pathname==='/index.html'?['run']:[]);
        if([...url.searchParams.keys()].some(k=>!allowed.includes(k)||url.searchParams.getAll(k).length!==1)){send(405,{error:'Read query only; unknown/effect options are unavailable'});return;}
        const asset=this.assets.get(url.pathname as SourceWebAsset['path']);if(asset){send(200,asset.body,asset.contentType);return;}
        if(!Object.hasOwn(routes,url.pathname)){send(404,{error:'Unknown read route'});return;}
        if(url.pathname==='/api/runs'){send(200,this.view.runs().map(r=>({id:r.id,revision:r.revision,state:r.state,objective:r.spec.config.objective.description})));return;}
        const run=url.searchParams.get('run')??'';
        if(url.pathname==='/api/projection'){const p=this.view.project(run);send(p?200:404,p??{error:'Unknown research run'});return;}
        if(url.pathname==='/api/replay'){const p=this.view.replay(run);send(p?200:404,p??{error:'Unknown research run'});return;}
        if(url.pathname==='/api/diff'){const revision=Number(url.searchParams.get('revision'));if(!url.searchParams.has('revision')||!Number.isSafeInteger(revision))throw new Error('Exact revision required');send(200,this.view.diff(run,url.searchParams.get('attempt')??'',revision));return;}
        if(url.pathname==='/api/artifact'){send(200,await this.view.artifact(run,url.searchParams.get('id')??''),'application/octet-stream');return;}
        const initial=this.view.project(run);if(!initial){send(404,{error:'Unknown research run'});return;}
        response.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store'});
        let revision=initial.run.revision;
        response.write(`event: projection\ndata: ${JSON.stringify(initial)}\n\n`);this.#streams.add(response);
        const timer=setInterval(()=>{try{const p=this.view.project(run);if(p&&p.run.revision!==revision){revision=p.run.revision;response.write(`event: projection\ndata: ${JSON.stringify(p)}\n\n`);}}catch{response.write('event: unavailable\ndata: Refresh from the owning Pi\n\n');response.end();}},500);
        this.#timers.add(timer);response.on('close',()=>{clearInterval(timer);this.#timers.delete(timer);this.#streams.delete(response);});
      })().catch(error=>{if(!response.headersSent)send(409,{error:String(error)});else response.end();});
    });
  }
  static async start(view:SourceView):Promise<ReadOnlyServer>{
    const result=new ReadOnlyServer(view,await SourceWebAssets.load());
    await new Promise<void>((resolve,reject)=>{result.#server.once('error',reject);result.#server.listen(0,'127.0.0.1',()=>{result.#server.off('error',reject);resolve();});});
    result.#url=`http://127.0.0.1:${(result.#server.address() as AddressInfo).port}`;return result;
  }
  get url(){return this.#url;}
  async close(){for(const timer of this.#timers)clearInterval(timer);this.#timers.clear();for(const response of this.#streams)response.end();this.#streams.clear();await new Promise<void>((resolve,reject)=>this.#server.close(e=>e?reject(e):resolve()));}
}
