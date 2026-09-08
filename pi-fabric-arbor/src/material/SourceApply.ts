import { closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, readlinkSync, realpathSync, renameSync, symlinkSync, unlinkSync, writeFileSync, chmodSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { canonical, digest, id, validate } from '../research/contracts.js';
import { gitBytes, materialPath, type Capture, type Workspace } from './Workspace.js';

interface Image { mode: '100644'|'100755'|'120000'; bytes: string; permissions: number }
interface PathChange { path: string; before: Image|null; after: Image|null }
export interface SourceIntent {
 version: 1; operationId: string; kind: 'apply'|'undo'; parent: string|null;
 captureId: string; root: string; baseline: string; target: string;
 binding: Record<string, unknown>; patch: string; paths: PathChange[];
}
export interface SourceJournal { intent: SourceIntent; identity: string; state: 'intent'|'writing'|'applied'|'conflict'; started: string[]; error: string|null; adoptions?: Record<string,unknown>[] }
/** Exact affected-path journal. It never uses the source Git index or an inverse
 * patch. Ambiguous mixed outcomes are retained for manual conflict resolution.
 * Trusted filesystem consistency, not confinement or arbitrary-writer locking. */
export class SourceApply {
 constructor(readonly workspace: Workspace) {}
 path(operationId: string): string { validate(id,operationId);return join(this.workspace.directory,'source-operations',operationId+'.json'); }
 read(operationId: string): SourceJournal|undefined {
  const path=this.path(operationId);if(!existsSync(path))return undefined;
  const j=JSON.parse(readFileSync(path,'utf8')) as SourceJournal;
  if(j.intent?.version!==1||j.intent.operationId!==operationId||j.identity!==digest(j.intent)||!['intent','writing','applied','conflict'].includes(j.state)||!Array.isArray(j.started))throw new Error('Source journal identity mismatch');
  return j;
 }
 #save(j:SourceJournal):void {
  const path=this.path(j.intent.operationId);mkdirSync(dirname(path),{recursive:true});
  const tmp=path+'.'+randomUUID()+'.tmp';const fd=openSync(tmp,'wx',0o600);
  try{writeFileSync(fd,canonical(j)+'\n');fsyncSync(fd);}finally{closeSync(fd);}
  renameSync(tmp,path);this.#sync(dirname(path));
 }
 #sync(directory:string):void {const fd=openSync(directory,'r');try{fsyncSync(fd);}finally{closeSync(fd);}}
 #parents(root:string,path:string,create=false):void {
  materialPath(path);if(realpathSync(root)!==root)throw new Error('Original source canonical root changed');
  let dir=root;for(const part of path.split('/').slice(0,-1)){
   dir=join(dir,part);let stat;
   try{stat=lstatSync(dir);}catch(e){
    if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;
    if(!create)continue;mkdirSync(dir);stat=lstatSync(dir);
   }
   // existsSync follows symlinks and misses dangling parents. Inspect the entry
   // itself during whole-set preflight, before any earlier valid path is written.
   if(!stat.isDirectory()||stat.isSymbolicLink())throw new Error('Source parent conflict: '+path);
  }
 }
 #image(root:string,path:string):Image|null {
  this.#parents(root,path);const file=join(root,path);let stat;
  try{stat=lstatSync(file);}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return null;throw e;}
  if(!stat.isFile()&&!stat.isSymbolicLink())throw new Error('Source file type conflict: '+path);
  if(stat.isFile()&&stat.nlink!==1)throw new Error('Source hardlink conflict: '+path);
  return {mode:stat.isSymbolicLink()?'120000':stat.mode&0o111?'100755':'100644',bytes:(stat.isSymbolicLink()?readlinkSync(file,{encoding:'buffer'}):readFileSync(file)).toString('base64'),permissions:stat.mode&0o777};
 }
 #tree(c:Capture,oid:string):Map<string,Image> {
  const files=new Map<string,Image>();
  for(const line of gitBytes(c.repository,['ls-tree','-rz','--full-tree',oid]).toString('utf8').split('\0').filter(Boolean)){
   const tab=line.indexOf('\t'),path=line.slice(tab+1),[mode,kind,blob]=line.slice(0,tab).split(' ');materialPath(path);
   if(kind!=='blob'||!['100644','100755','120000'].includes(mode!))throw new Error('Unsupported source apply tree entry');
   files.set(path,{mode:mode as Image['mode'],bytes:gitBytes(c.repository,['cat-file','blob',blob!]).toString('base64'),permissions:mode==='120000'?0o777:mode==='100755'?0o755:0o644});
  }return files;
 }
 async prepare(c:Capture,target:string,operationId:string,binding:Record<string,unknown>):Promise<SourceJournal> {
  await this.workspace.verify(c);await this.workspace.checkScope(c,target);
  const old=this.read(operationId);
  if(old){if(old.intent.kind!=='apply'||old.intent.captureId!==c.id||old.intent.target!==target||canonical(old.intent.binding)!==canonical(binding))throw new Error('Source operation binding identity changed');return old;}
  const before=this.#tree(c,c.baseline),after=this.#tree(c,target),paths:PathChange[]=[];let error:string|null=null;
  for(const path of [...new Set([...before.keys(),...after.keys()])].sort()){
   let pre=before.get(path)??null,post=after.get(path)??null;if(canonical(pre)===canonical(post))continue;
   try{
    const actual=this.#image(c.root,path);
    if(canonical(actual&&{mode:actual.mode,bytes:actual.bytes})!==canonical(pre&&{mode:pre.mode,bytes:pre.bytes}))error??='Source preimage conflict: '+path;
    else {pre=actual;if(post&&actual&&post.mode!=='120000'&&actual.mode!=='120000')post={...post,permissions:(actual.permissions&~0o111)|(post.mode==='100755'?0o111:0)};}
   }catch(e){error??=String(e);}
   paths.push({path,before:pre,after:post});
  }
  if(!paths.length)throw new Error('No source delta to apply');
  const intent:SourceIntent={version:1,operationId,kind:'apply',parent:null,captureId:c.id,root:c.root,baseline:c.baseline,target,binding:structuredClone(binding),patch:await this.workspace.export(c,target),paths};
  const j:SourceJournal={intent,identity:digest(intent),state:error?'conflict':'intent',started:[],error};this.#save(j);return j;
 }
 async apply(c:Capture,target:string,operationId:string,binding:Record<string,unknown>):Promise<SourceJournal> {return this.execute(c,await this.prepare(c,target,operationId,binding));}
 async undo(c:Capture,parent:string,operationId:string,binding:Record<string,unknown>):Promise<SourceJournal> {return this.execute(c,await this.prepareUndo(c,parent,operationId,binding));}
 async prepareUndo(c:Capture,parent:string,operationId:string,binding:Record<string,unknown>):Promise<SourceJournal> {
  await this.workspace.verify(c);const applied=this.read(parent);
  if(!applied||applied.state!=='applied'||applied.intent.kind!=='apply'||applied.intent.captureId!==c.id)throw new Error('Exact completed source apply required; no blind inverse');
  let j=this.read(operationId);
  if(j){if(j.intent.kind!=='undo'||j.intent.parent!==parent||canonical(j.intent.binding)!==canonical(binding))throw new Error('Undo operation binding identity changed');}
  else {const intent:SourceIntent={...structuredClone(applied.intent),operationId,kind:'undo',parent,binding:structuredClone(binding),paths:applied.intent.paths.map(p=>({path:p.path,before:p.after,after:p.before}))};j={intent,identity:digest(intent),state:'intent',started:[],error:null};this.#save(j);}
  return j;
 }
 /** Fresh owner commands may adopt an original intent, never rebind/replay its
  * approval. Unlike execute, this path cannot write even an all-preimage set. */
 adopt(c:Capture,j:SourceJournal,binding:Record<string,unknown>):SourceJournal {
  const saved=this.read(j.intent.operationId);
  if(!saved||canonical(saved)!==canonical(j)||j.intent.kind!=='apply'||j.intent.captureId!==c.id||j.intent.root!==c.root||j.intent.baseline!==c.baseline)throw new Error('Source recovery intent identity mismatch');
  if(canonical(binding.owner)!==canonical(j.intent.binding.owner)||binding.specId!==j.intent.binding.specId||binding.epoch!==j.intent.binding.epoch||binding.runId!==j.intent.binding.runId||binding.materialId!==c.id||binding.response!=='Apply exact source delta')throw new Error('Source recovery owner approval mismatch');
  const prior=j.adoptions?.find(b=>b.commandId===binding.commandId);
  if(prior&&canonical(prior)!==canonical(binding))throw new Error('Conflicting source recovery command');
  if(!prior&&(j.adoptions?.length??0)>=128)throw new Error('Source recovery receipt capacity exhausted');
  if(j.state==='conflict')return j;
  try{
   if(!j.intent.paths.length||!j.intent.paths.every(p=>canonical(this.#image(c.root,p.path))===canonical(p.after)))throw new Error('Source recovery requires complete exact postimages; mixed/newer/preimage effects retained without writes');
   j.state='applied';j.error=null;
   if(!prior)(j.adoptions??=[]).push(structuredClone(binding));
  }catch(e){j.state='conflict';j.error=String(e);}
  this.#save(j);return j;
 }
 execute(c:Capture,j:SourceJournal):SourceJournal {
  if(j.intent.captureId!==c.id||j.intent.root!==c.root||j.intent.baseline!==c.baseline)throw new Error('Source journal capture identity mismatch');
  if(j.state==='conflict')return j;
  try{
   const observed=j.intent.paths.map(p=>this.#image(c.root,p.path));
   const allPost=observed.every((image,i)=>canonical(image)===canonical(j.intent.paths[i]!.after));
   if(allPost){j.state='applied';j.error=null;this.#save(j);return j;}
   if(j.state==='applied'||!observed.every((image,i)=>canonical(image)===canonical(j.intent.paths[i]!.before)))throw new Error('Partial source apply or newer preimage conflict; patch retained, no replay/inverse');
   for(const p of j.intent.paths){
    j.state='writing';if(!j.started.includes(p.path))j.started.push(p.path);this.#save(j); // durable intent BEFORE each write
    this.#parents(c.root,p.path,true);
    if(canonical(this.#image(c.root,p.path))!==canonical(p.before))throw new Error('Source preimage changed before write: '+p.path);
    const file=join(c.root,p.path);
    if(p.after===null){unlinkSync(file);}
    else {
     const temporary=join(dirname(file),'.arbor-'+randomUUID()+'.tmp'),bytes=Buffer.from(p.after.bytes,'base64');
     if(p.after.mode==='120000')symlinkSync(bytes,temporary);
     else {const fd=openSync(temporary,'wx',p.after.permissions);try{writeFileSync(fd,bytes);fsyncSync(fd);}finally{closeSync(fd);}chmodSync(temporary,p.after.permissions);}
     // No await between the final comparison and replacement. No source Git calls.
     if(canonical(this.#image(c.root,p.path))!==canonical(p.before))throw new Error('Source preimage changed before replacement: '+p.path);
     renameSync(temporary,file);
    }
    this.#sync(dirname(file));
   }
   if(!j.intent.paths.every(p=>canonical(this.#image(c.root,p.path))===canonical(p.after)))throw new Error('Source postimage conflict');
   j.state='applied';j.error=null;
  }catch(e){j.state='conflict';j.error=String(e);}
  this.#save(j);return j;
 }
}
