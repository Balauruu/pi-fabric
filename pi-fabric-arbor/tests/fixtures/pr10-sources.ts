export function sourceProvider(app:string,trace:string):string{return `
import {appendFileSync} from 'node:fs';
import {FABRIC_PROVIDER_REGISTER_EVENT,FABRIC_PROVIDER_DISCOVER_EVENT} from 'pi-fabric/protocol';
import {sourceSearchInputSchema,sourceSearchOutputSchema,sourceFetchInputSchema,sourceFetchOutputSchema} from ${JSON.stringify(app+'/src/research/GroundingContracts.ts')};
export default function(pi){
 const descriptors=[{name:'search',description:'Deterministic local public search outputs',inputSchema:sourceSearchInputSchema(),outputSchema:sourceSearchOutputSchema(),risk:'read',effect:{kind:'none',resources:[],ordering:'commutative'}},{name:'fetch',description:'Deterministic local public fetch outputs',inputSchema:sourceFetchInputSchema(),outputSchema:sourceFetchOutputSchema(),risk:'read',effect:{kind:'none',resources:[],ordering:'commutative'}}];
 const provider={name:'pr10public',description:'Only bounded fake search/fetch outputs; no Arbor driver or domain mutation',async list(){return descriptors},async describe(name){return descriptors.find(d=>d.name===name)},async invoke(name,args){appendFileSync(${JSON.stringify(trace)},JSON.stringify({event:'pr10.public',data:{name,args}})+'\\n');if(name==='search')return {results:[{url:'https://example.test/article',title:'Public article',snippet:'DISCOVERY_ONLY_NOT_INSPECTED'}]};if(name==='fetch')return {url:args.url,title:'Visited public article',text:'Visited full article. Caching avoids repeated parsing. Negative results require local retesting.'};throw new Error('Unknown public source action')}};
 pi.events.emit(FABRIC_PROVIDER_REGISTER_EVENT,{version:1,provider,overwrite:true});pi.events.on(FABRIC_PROVIDER_DISCOVER_EVENT,e=>e.register(provider,{overwrite:true}));
}
`;}
