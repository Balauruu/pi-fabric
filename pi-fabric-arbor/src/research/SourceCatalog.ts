import {readFileSync} from 'node:fs';
import type {FabricActionDescriptor,FabricCommittedCapabilityView} from 'pi-fabric/protocol';
import {array,canonical,closed,digest,id,str,validate} from './contracts.js';
import {sourceSearchInputSchema,sourceSearchOutputSchema,sourceFetchInputSchema,sourceFetchOutputSchema} from './GroundingContracts.js';
import {bindRequest,immutableCopy} from '../evaluators/trust.js';
export interface SourceCapability {ref:string;descriptorHash:string}
export interface SourceCatalogEntry {id:string;search:SourceCapability;fetch:SourceCapability}
export function readSourceCatalog(path:string):SourceCatalogEntry[]{
 let value:unknown;try{const text=readFileSync(path,'utf8');if(Buffer.byteLength(text)>65536)throw new Error('Source catalog exceeds bound');value=JSON.parse(text);}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return [];throw e;}
 const capability=closed({ref:{...str(),pattern:'^[A-Za-z][A-Za-z0-9_-]*(?:\\.[A-Za-z][A-Za-z0-9_-]*){1,3}$'},descriptorHash:{...str(64),pattern:'^[a-f0-9]{64}$'}});
 validate(array(closed({id,search:capability,fetch:capability}),4),value);const entries=value as SourceCatalogEntry[];
 if(new Set(entries.map(e=>e.id)).size!==entries.length||entries.some(e=>[e.search,e.fetch].some(c=>/^(arbor|agents|pi|fabric|components|schema|mesh|state|memory|compact)\./u.test(c.ref))))throw new Error('Source catalog requires distinct IDs and exact external source actions');
 return entries;
}
/** Fixed search/fetch integration, not a generic provider transport. Optional
 * requirements are declared before activation; a run cannot widen this view. */
export class SourceCatalog {
 readonly entries:readonly SourceCatalogEntry[];readonly view:FabricCommittedCapabilityView;readonly id:string;
 constructor(entries:readonly SourceCatalogEntry[],view:FabricCommittedCapabilityView,readonly call:(ref:string,args:Record<string,unknown>)=>Promise<unknown>,readonly describe?:(ref:string)=>Promise<FabricActionDescriptor|undefined>){this.entries=immutableCopy(entries);this.view=immutableCopy(view);this.id=digest(this.entries);Object.freeze(this);}
 binding(catalogId:string,kind:'search'|'fetch'){
  const entry=this.entries.find(e=>e.id===catalogId);if(!entry)throw new Error('Selected grounding catalog is unavailable; explicit quiescent source-catalog registration required');
  const cap=entry[kind],binding=this.view.bindings[cap.ref];if(!binding)throw new Error(`Optional grounding capability unavailable: ${cap.ref}`);
  if(binding.descriptorHash!==cap.descriptorHash)throw new Error(`Grounding descriptor mismatch: ${cap.ref}; inspect and explicitly rebind catalog`);
  return {cap,binding:canonical(binding)};
 }
 async invoke(catalogId:string,kind:'search'|'fetch',args:Record<string,unknown>,beforeDispatch:()=>Promise<void>){
  const {cap,binding}=this.binding(catalogId,kind),input=kind==='search'?sourceSearchInputSchema():sourceFetchInputSchema(),output=kind==='search'?sourceSearchOutputSchema():sourceFetchOutputSchema();validate(input,args);
  const request=bindRequest(args),descriptor=await request.accept(Promise.resolve(this.describe?.(cap.ref)));
  if(!descriptor||canonical(descriptor.inputSchema)!==canonical(input)||canonical(descriptor.outputSchema)!==canonical(output)||!['read','network'].includes(descriptor.risk)||descriptor.effect?.kind!=='none'||descriptor.effect.ordering!=='commutative')throw new Error(`Incompatible bounded grounding ${kind} descriptor`);
  await beforeDispatch();request.check();const result=await request.accept(this.call(cap.ref,request.args));validate(output,result);
  return {value:result as any,provenance:{ref:cap.ref,binding,requestId:digest(request.expected),resultId:digest(result)}};
 }
}
