import { array, closed, enumeration, id, integer, nullable, str } from './schema.js';
export function groundingConfigSchema(){return closed({mode:enumeration('off','optional','required'),catalog:nullable(id),query:nullable(str(512)),maxSources:integer(4,1),model:nullable(str(256))},[]);}
export function sourceReferenceSchema(){return closed({sourceId:id,runId:id,revision:integer(),digest:str(64)});}
export function sourceSearchInputSchema(){return closed({query:str(512),limit:integer(4,1)});}
export function sourceSearchOutputSchema(){return closed({results:array(closed({url:str(4096),title:str(512),snippet:{type:'string',maxLength:2048}}),4)});}
export function sourceFetchInputSchema(){return closed({url:str(4096),maxChars:integer(16384,1)});}
export function sourceFetchOutputSchema(){return closed({url:str(4096),title:str(512),text:str(16384)});}
const provenance=()=>({runId:id,materialId:id,epoch:id,specId:str(64),generation:str(),revision:integer(),catalogId:str(64)});
const artifact=()=>closed({path:str(4096),digest:str(64)});
const accessCall=()=>closed({ref:str(),binding:str(4096),requestId:str(64),resultId:str(64)});
export function sourceAccessSchema(){return closed({id,kind:enumeration('source-access'),...provenance(),url:str(4096),title:str(512),artifact:artifact(),search:accessCall(),fetch:accessCall(),characters:integer(16384,1),validation:enumeration('visited-not-yet-inspected')});}
const meaningful=()=>({...str(4096),pattern:'\\S'});
export function sourceInspectionSchema(){return closed({id,digest:str(64),kind:enumeration('source-inspection'),...provenance(),accessId:id,url:str(4096),title:str(512),artifact:artifact(),passage:meaningful(),claim:meaningful(),limitations:meaningful(),nativeId:str(),requestId:str(64),roleBundleId:str(96),model:str(),validation:enumeration('source-linked-hypothesis-not-grade')});}
export function literatureResultSchema(){return closed({sentinel:enumeration('ARBOR_LITERATURE_RESULT_V1'),batchId:id,sources:array(closed({accessId:id,passage:meaningful(),claim:meaningful(),limitations:meaningful()}),4),blocked:nullable(str(4096))});}
export function groundingStateSchema(){return closed({batchId:id,status:enumeration('reserved','accessed','complete','unavailable','blocked','interrupted'),catalogId:nullable(str(64)),accessIds:array(id,4),sourceIds:array(id,4),calls:integer(6),error:nullable(str(4096))});}
export interface GroundingConfig {mode:'off'|'optional'|'required';catalog:string|null;query:string|null;maxSources:number;model:string|null}
export interface GroundingState {batchId:string;status:'reserved'|'accessed'|'complete'|'unavailable'|'blocked'|'interrupted';catalogId:string|null;accessIds:string[];sourceIds:string[];calls:number;error:string|null}
export interface SourceAccess {id:string;kind:'source-access';runId:string;materialId:string;epoch:string;specId:string;generation:string;revision:number;catalogId:string;url:string;title:string;artifact:{path:string;digest:string};search:{ref:string;binding:string;requestId:string;resultId:string};fetch:{ref:string;binding:string;requestId:string;resultId:string};characters:number;validation:'visited-not-yet-inspected'}
export interface SourceInspection extends Omit<SourceAccess,'kind'|'search'|'fetch'|'characters'|'validation'> {kind:'source-inspection';digest:string;accessId:string;passage:string;claim:string;limitations:string;nativeId:string;requestId:string;roleBundleId:string;model:string;validation:'source-linked-hypothesis-not-grade'}
export interface LiteratureResult {sentinel:'ARBOR_LITERATURE_RESULT_V1';batchId:string;sources:Array<{accessId:string;passage:string;claim:string;limitations:string}>;blocked:string|null}
