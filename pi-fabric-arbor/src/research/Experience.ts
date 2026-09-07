import { canonical, digest, type Proposal } from './contracts.js';
import type { Receipt, ResearchRun } from './ResearchStore.js';

export interface LessonReference { runId:string; lessonId:string; revision:number; digest:string }
export interface LessonProvenance {
  runId:string; revision:number; materialId:string; epoch:string; specId:string;
  sourceIds:string[]; uninspectedSourceRefs:string[]; materials:string[]; applicability:string; outcome:string;
}
export interface LessonHit extends LessonProvenance {
  lessonId:string; nodeId:string; insight:string; limitations:string; evidenceIds:string[];
  reference:LessonReference; validation:'hypothesis-to-retest'; reason:string; duplicateOf:string|null;
}
export function lessonReference(lesson:Record<string,any>):LessonReference {
  return {runId:lesson.provenance.runId,lessonId:lesson.lessonId,revision:lesson.provenance.revision,digest:digest(lesson)};
}
/** Selection is bounded lexical navigation, never scientific endorsement. Duplicates
 * remain separate provenance records; opposing observations are not overwritten. */
export function selectLessons(rows:Record<string,any>[], query:string, limit:number):LessonHit[] {
  const terms=[...new Set(query.toLocaleLowerCase('en-US').match(/[\p{L}\p{N}]+/gu)??[])].slice(0,16);
  const ranked=rows.map(l=>({l,matched:terms.filter(t=>(l.insight+' '+l.limitations+' '+l.provenance.applicability).toLocaleLowerCase('en-US').includes(t))})).filter(x=>!terms.length||x.matched.length).sort((a,b)=>b.matched.length-a.matched.length);
  const seen=new Map<string,string>();const hits:LessonHit[]=[];let bytes=0;
  for(const {l,matched} of ranked){
    const key=digest({insight:l.insight.trim().toLocaleLowerCase('en-US'),limitations:l.limitations.trim().toLocaleLowerCase('en-US'),applicability:l.provenance.applicability,outcome:l.provenance.outcome});
    const identity=l.provenance.runId+'/'+l.lessonId;
    const hit:LessonHit={...l.provenance,lessonId:l.lessonId,nodeId:l.nodeId,insight:l.insight,limitations:l.limitations,evidenceIds:l.evidenceIds,reference:lessonReference(l),validation:'hypothesis-to-retest',reason:matched.length?'literal terms: '+matched.join(', '):'recent project lesson',duplicateOf:seen.get(key)??null};
    const size=Buffer.byteLength(canonical(hit));if(bytes+size>16384)continue;
    seen.set(key,seen.get(key)??identity);hits.push(hit);bytes+=size;if(hits.length===limit)break;
  }
  return hits;
}
export interface ProposalTrajectory {
  id:string; runId:string; materialId:string; epoch:string; generation:string;
  actorId:string; nativeId:string; requestId:string; proposal:Proposal;
  context:{id:string;revision:number;incumbent:string|null;nodeIds:string[];attemptIds:string[];evidenceIds:string[];lessonRefs:LessonReference[];sourceIds:string[]};
  selectedAction:string;
  outcome:null|{receipt:Receipt|null;error:string|null;revision:number;incumbent:string|null;attemptIds:string[];evaluationIds:string[];materialIds:string[];insightIds:string[]};
}
export function proposalTrajectory(p:Proposal, run:ResearchRun, native:{actorId:string;nativeId:string;requestId:string;context:Record<string,any>}):ProposalTrajectory {
  const c=native.context;
  const ids=(items:any[],key:string,max:number)=>(items??[]).map(x=>x[key]).filter((x:any)=>typeof x==='string').slice(0,max);
  return {id:`trajectory-${digest({runId:run.id,commandId:p.commandId}).slice(0,32)}`,runId:run.id,materialId:p.materialId,epoch:p.epoch,generation:run.generation,actorId:native.actorId,nativeId:native.nativeId,requestId:native.requestId,proposal:structuredClone(p),selectedAction:p.kind,
    context:{id:digest(c),revision:p.revision,incumbent:c.currentIncumbent??null,nodeIds:ids(c.nodes,'nodeId',16),attemptIds:ids(c.attempts,'id',8),evidenceIds:ids(c.evidence,'id',8),lessonRefs:(c.recalledLessons??[]).map((l:any)=>l.reference).slice(0,8),sourceIds:ids(c.sources,'id',8)},outcome:null};
}
