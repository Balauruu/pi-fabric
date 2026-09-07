import {lstat, mkdir, readFile, realpath, writeFile} from 'node:fs/promises';
import {isAbsolute, dirname, join, relative, resolve, sep} from 'node:path';
import {createHash} from 'node:crypto';
import {array, closed, enumeration, integer, str} from '../research/schema.js';
import {validate, digest, CONFIG_SCHEMA} from '../research/contracts.js';
import {validateDefinition, type EvaluationDefinition} from '../evaluators/contracts.js';
import {validationPolicy} from '../evaluators/validation.js';
import {arborPackageRoot} from '../package-layout.js';
import {presetSchema} from './contract.js';
export {SCAFFOLD_SCHEMA, scaffoldResultSchema} from './schemas.js';
import {SCAFFOLD_SCHEMA} from './schemas.js';
export interface ScaffoldRequest {pack:'code'|'agent'|'recipe'|'upstream-command';destination:string;environment:{node:string;coordinatorModel:string;executorModel:string;subjectModel:string};heldOut:boolean;prepared?:{root:string;files:string[];argv:string[];checks:string[][];unit:string;revision:string;sourceUrl:string}}
export const packManifestSchema=()=>closed({version:{...integer(1,1),enum:[1]},packs:array(closed({id:enumeration('code','agent','recipe'),preset:str(128),materialKind:enumeration('code','instructions','recipe'),mutablePaths:array(str(128),16,1),evaluationInputs:array(str(128),16),files:array(str(128),32,1),evaluator:enumeration('command','agent-suite'),unit:str(64),description:str(4096)}),3,3),environment:closed({node:str(),git:str(),inference:str(4096),dependencies:str(4096),optional:str(4096)})});
export async function readPackManifest(){const value=JSON.parse(await readFile(join(arborPackageRoot(),'examples/manifest.json'),'utf8'));validate(packManifestSchema(),value);if(new Set(value.packs.map((p:any)=>p.id)).size!==3)throw new Error('Duplicate pack identity');return value;}
function jsonAsset(value:unknown,label:string,maxBytes:number){const text=JSON.stringify(value,null,2)+"\n";if(Buffer.byteLength(text)>maxBytes)throw new Error(`${label} exceeds bound`);return text;}
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
function child(path:string){if(!path||isAbsolute(path)||path.includes('\\')||path.split('/').some(p=>p==='.'||p==='..'||!p))throw new Error('Expected safe relative file path');return path;}
async function regular(path:string){const stat=await lstat(path);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>65536||await realpath(path)!==path)throw new Error('Expected bounded canonical regular preparation input');const bytes=await readFile(path);if(bytes.length>65536)throw new Error("Preparation input grew beyond bound");return {bytes,mode:stat.mode&0o111?0o700:0o600};}
/** Pure local preparation under the owning-Pi write route. No subprocess, install,
 * download, Git initialization, research launch, source update or overwrite. */
export async function scaffold(request:ScaffoldRequest,admit:()=>void=()=>{}) {
  validate(SCAFFOLD_SCHEMA,request);request=structuredClone(request);
  const {pack,environment,heldOut}=request;
  if(!isAbsolute(request.destination)||resolve(request.destination)!==request.destination||await realpath(dirname(request.destination))!==dirname(request.destination))throw new Error('Destination needs an existing canonical nonsymlink parent and absolute new child');
  if(!isAbsolute(environment.node))throw new Error('Select an absolute local Node executable');
  const node=await lstat(environment.node);if(!node.isFile()&&!node.isSymbolicLink())throw new Error('Node executable unavailable');
  if(heldOut&&pack!=='agent')throw new Error('This pack has no disjoint held-out split');
  if((pack==='upstream-command')!==Boolean(request.prepared))throw new Error('Only upstream-command accepts required explicit prepared inputs');
  const destination=request.destination,material=join(destination,'material'),assets=new Map<string,Uint8Array|string>(),modes=new Map<string,number>();
  const manifest=await readPackManifest();
  const metadata=manifest.packs.find((p:any)=>p.id===pack);
  let preset:any,files:string[],mutablePaths:string[],evaluationInputs:string[],tasks:any[],command:EvaluationDefinition['command'],provenance:any;
  if(pack==='upstream-command'){
    const prepared=request.prepared!;
    if(!isAbsolute(prepared.root)||await realpath(prepared.root)!==prepared.root)throw new Error('Prepared input root must be canonical');
    if(destination===prepared.root||destination.startsWith(prepared.root+sep)||prepared.root.startsWith(destination+sep))throw new Error('Destination must be separate from prepared source');
    files=prepared.files.map(child);if(new Set(files).size!==files.length)throw new Error('Duplicate preparation files');
    for(const file of files){const input=await regular(join(prepared.root,file));assets.set('material/'+file,input.bytes);modes.set('material/'+file,input.mode);}
    // Maintained local command template, not the upstream coordinator or tree.
    preset=JSON.parse(await readFile(join(arborPackageRoot(),'examples/code/preset.json'),'utf8'));
    preset.id='arbor-upstream-command';preset.objectiveDefaults.unit=prepared.unit;preset.objectiveDefaults.description='Evaluate explicitly prepared local benchmark material; adapt objective before research';
    preset.sourceRefs=[prepared.sourceUrl,'upstream-revision:'+prepared.revision];mutablePaths=[...files];evaluationInputs=[];
    tasks=[{id:'prepared-command',prompt:'Run the frozen local prepared command',expected:'checked-command'}];
    command={argv:prepared.argv,checks:prepared.checks,unit:prepared.unit};provenance={adapter:'arbor-local-command-template-v1',upstream:prepared};
  }else{
    preset=JSON.parse(await readFile(join(arborPackageRoot(),'examples',metadata.preset),'utf8'));
    files=metadata.files.map(child);mutablePaths=metadata.mutablePaths;evaluationInputs=metadata.evaluationInputs;
    for(const file of files){const input=await regular(join(arborPackageRoot(),'examples',pack,file));assets.set('material/'+file,input.bytes);modes.set('material/'+file,input.mode);}
    tasks=pack==='agent'?JSON.parse(await readFile(join(arborPackageRoot(),'examples/agent/tasks.json'),'utf8')).development:[{id:pack+'-work',prompt:metadata.description,expected:'checked-command'}];
    const script=pack==='code'?'bench.cjs':'evaluate.cjs';command=pack==='agent'?null:{argv:[environment.node,script],checks:[[environment.node,script,'--check']],unit:metadata.unit};
    provenance={manifestId:digest(manifest),pack};
  }
  validate(presetSchema(),preset);
  const definition=validateDefinition({version:1,kind:pack==='agent'?'agent-suite':'command',baseline:{root:material,oid:'capture',files},candidate:{root:material,oid:'capture',files},tasks,repeats:preset.evaluator.repeats,retries:0,deadlineMs:pack==='agent'?120000:20000,analysis:'paired-descriptive',order:'task-baseline-candidate',subject:{model:environment.subjectModel,tools:[],promptFiles:[mutablePaths[0]]},judge:null,command,providerAction:null});
  if(heldOut){const tasks=JSON.parse(await readFile(join(arborPackageRoot(),'examples/agent/tasks.json'),'utf8')).heldOut;const policy=validationPolicy({version:1,policy:'selected',maxUses:5,criterion:'non-regression',heldOut:{...definition,tasks},final:null},definition);assets.set('validation.json',jsonAsset(policy,'Validation policy',196608));}
  const overrides={execution:'research',preset:join(destination,'preset.json'),material:{root:material,mutablePaths,evaluationInputs,selectedUntracked:files},evaluator:{definition:join(destination,'evaluation.json'),heldOut:heldOut?join(destination,'validation.json'):null},roles:{coordinator:environment.coordinatorModel,executor:environment.executorModel,subject:environment.subjectModel},roleTools:{executor:['read','write','edit','bash']}};
  validate(CONFIG_SCHEMA,overrides);if(Buffer.byteLength(JSON.stringify(overrides))>32768)throw new Error("Generated start exceeds bounded public receipt");
  assets.set('preset.json',jsonAsset(preset,'Preset',65536));assets.set('evaluation.json',jsonAsset(definition,'Evaluation definition',65536));
  const start={runId:pack+'-research',overrides};assets.set('start.json',JSON.stringify(start,null,2)+'\n');
  const inputs=[...assets].map(([path,bytes])=>({path,mode:modes.get(path)??0o600,sha256:sha(typeof bytes==='string'?Buffer.from(bytes):bytes)}));
  const preparation={version:1,status:'unvalidated',limitation:'Preparation is not baseline evidence. Inspect the actual run baseline validity and checks before claiming validation. No data/services installed or downloaded.',environment,provenance,inputs};
  const preparationId=digest(preparation);assets.set('preparation.json',JSON.stringify({...preparation,preparationId},null,2)+'\n');
  admit();await mkdir(destination); // Exclusive creation. Existing artifacts, including symlinks, are conflicts.
  // A failed write retains a clearly unvalidated partial directory; never deletes user artifacts.
  for(const [path,bytes] of assets){admit();const target=join(destination,path);if(relative(destination,target).startsWith('..'))throw new Error('Asset escape');await mkdir(dirname(target),{recursive:true});admit();await writeFile(target,bytes,{flag:'wx',mode:modes.get(path)??0o600});admit();}
  admit();return {status:'unvalidated' as const,destination,preparationId,start};
}
