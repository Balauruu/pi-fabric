import {constants} from 'node:fs';
import {open,realpath} from 'node:fs/promises';
import {join,resolve,sep} from 'node:path';
import {ResearchStore} from '../research/ResearchStore.js';
import {canonical,digest,id,validate} from '../research/contracts.js';
import {gitText} from '../material/Workspace.js';
import type {ProposalTrajectory} from '../research/Experience.js';

export type Projection = Record<string, any>;
/** Read capability only. Each store call uses its existing non-creating transaction.
 * No owner, service, remote callback, watcher, writable cache or export generator. */
export class SourceView {
  constructor(readonly directory: string) {}
  #read<T>(fn:(store:ResearchStore)=>T):T { const store=new ResearchStore(join(this.directory,'research.sqlite3'));try{return fn(store);}finally{store.close();} }
  runs() { return this.#read(s=>s.runs()); }
  ownedRunSelection(sessionId:string) { return this.#read(s=>s.ownedRunSelection(sessionId)); }
  project(runId:string):Projection|null {validate(id,runId);return this.#read(s=>s.projection(runId));}
  replay(runId:string) {validate(id,runId);return this.#read(s=>s.replay(runId));}
  diff(runId:string,attemptId:string,revision:number) {
    const p=this.project(runId);if(!p||p.run.revision!==revision)throw new Error('Research revision changed; refresh the view');
    const m=p.run.material,c=m?.candidates.find((c:any)=>c.id===attemptId);
    if(!m||!c?.oid)throw new Error('No frozen candidate material; unresolved writers are not a diff');
    return {runId,revision,attemptId,baseline:m.capture.baseline,parent:c.parent,selected:c.oid,
      patch:gitText(m.capture.repository,['diff','--no-ext-diff','--no-textconv','--binary',c.parent,c.oid,'--'])};
  }
  async artifact(runId:string,artifactId:string):Promise<Buffer> {
    const p=this.project(runId);const ref=p?.artifact_refs.find((a:any)=>a.id===artifactId&&typeof a.path==='string');
    if(!ref)throw new Error('Unknown existing artifact');
    const root=await realpath(this.directory),path=resolve(ref.path);
    if(!path.startsWith(root+sep)||await realpath(path)!==path)throw new Error('Artifact path identity mismatch');
    const handle=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW);
    try{const stat=await handle.stat();if(!stat.isFile())throw new Error('Artifact is not a regular file');const bytes=await handle.readFile();const text=bytes.toString('utf8');const value=ref.kind==='source-operation'?JSON.parse(text):text;if(digest(value)!==ref.digest||(ref.kind==='source-operation'&&text!==canonical(value)+'\n'))throw new Error('Artifact digest mismatch');return bytes;}finally{await handle.close();}
  }
}
const json=(v:unknown)=>JSON.stringify(v,null,2);
const fence=(v:unknown)=>'\n````text\n'+(typeof v==='string'?v:json(v)).replaceAll('````','` ` ` `')+'\n````\n';
export function reportMarkdown(p:Projection):string {
 const r=p.run,c=r.spec.config;
 return `# Arbor research: ${r.id}\n\nRevision: ${r.revision}\nState: ${r.state}\nStop/execution reason: ${r.execution}\nFailure: ${r.error??'none recorded'}\nPending review: ${r.pendingDecisionId??'none'}\n\nA queued acknowledgment is not completion. Native completion is not a measured win.\n\n## Material and objective\n`+fence({material:r.spec.source,baseline:r.material?.capture.baseline??null,incumbent:r.material?.incumbent??null,objective:c.objective,models:r.spec.roles,preset:r.spec.presetSource??null,limits:c.limits,enforcement:r.spec.enforcement})+
 '\n## Validation and uncertainty\n'+fence(p.validation)+'\nDescriptive comparisons are not statistical superiority or transfer. Unknown costs remain observational and unavailable.\n'+
 '\n## Hypothesis tree\n'+fence(p.nodes)+'\n## Evidence and native references\n'+fence(p.evaluations)+'\n## Attempts and failures\n'+fence(p.attempts)+'\n## Exact decisions\n'+fence(p.decisions)+'\n## Lessons and limitations\n'+fence(p.lessons)+'\n## Controls and event tail\n'+fence({controls:p.controls,events:p.events})+
 (p.materialDelta?'\n## Captured-baseline delta\n'+fence(p.materialDelta):'');
}
export function trajectoryMarkdown(rows:ProposalTrajectory[]):string {
 return '# Arbor proposal trajectory\n\nAnalysis artifact, not a training pipeline or transcript mirror. Pending proposals are not completed operations.\n\n'+(rows.length?rows.map(t=>`## ${t.id}\n\nAction: ${t.selectedAction}\nMaterial: ${t.materialId}\nNative activation: ${t.nativeId}\n`+fence({proposal:t.proposal,context:t.context,outcome:t.outcome??'pending'})).join('\n'):'No recorded proposals.\n');
}
