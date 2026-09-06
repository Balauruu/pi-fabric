import { lstat, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { canonical } from './contracts.js';
import type { ResearchStore } from './ResearchStore.js';
import type { EvaluationRecord } from '../evaluators/contracts.js';
import { units } from '../evaluators/measurement.js';
/** Bounded factual projection, not a hypothesis chooser. Full evidence remains in the store. */
export function researchFacts(p: Record<string, any>) {
 let noGain=0, failedChecks=0, failures=0;
 const outcomes=(p.attempts as Array<Record<string, any>>).map((a:any)=>{
  const c=p.run.material.candidates?.find((c:any)=>c.id===a.id);
  const d=p.decisions.filter((d:any)=>d.nodeId===a.nodeId && ['measured-keep','applied'].includes(d.status) && ['keep','discard'].includes(d.decision)).at(-1);
  // A decision pins its exact evidence forever. Equal trees do not identify attempts.
  const e=d ? p.evaluations.find((e:any)=>e.attemptId===a.id && d.evidenceIds.includes(e.id)) : p.evaluations.filter((e:any)=>e.attemptId===a.id).at(-1);
  const outcome=d?.status==='measured-keep'?'kept':!e || e.state!=='completed'?'infrastructure-failure':e.validity!=='valid'?'failed-check':d?'valid-no-gain':'awaiting-decision';
  if(d || ['failed','stopped','timed_out'].includes(a.state)) {
   if(outcome==='kept'){noGain=0;failures=0;} else if(outcome==='valid-no-gain'){noGain++;failures=0;} else if(outcome==='failed-check'){failedChecks++;failures=0;} else failures++;
  }
  return {attemptId:a.id,nodeId:a.nodeId,materialId:e?.candidateOid??c?.oid??null,evaluationId:e?.id??null,comparedIncumbent:e?.baselineOid??null,outcome,decided:!!d};
 });
 return {noGain,failedChecks,failures,shiftRequired:noGain>=p.run.spec.config.search.shiftAfterNoGain,outcomes, evaluatorCalls:p.evaluations.reduce((n:number,e:any)=>n+(e.invocationCount??e.invocations.length),0)};
}
export function evaluationCapacity(p: Record<string, any>): number {
 const d=p.run.spec.evaluation; return d ? 2*d.tasks.length*d.repeats*(d.retries+1)*(d.judge?2:1) : 1;
}
export function stopReason(p: Record<string, any>, facts: ReturnType<typeof researchFacts>, bytes: number): string | null {
 const r=p.run,l=r.spec.config.limits,s=r.spec.config.search;
 const base=p.evaluations.find((e:any)=>e.id===r.material.baselineEvaluation);
 if(!base || base.state!=='completed' || base.validity!=='valid' || !base.quality.passed)return 'invalid-baseline';
 if(bytes>=l.artifactBytes)return 'artifact-budget';
 if(r.activeMs+(r.activeSince===null?0:Date.now()-r.activeSince)>=l.activeMs)return 'active-time-budget';
 if(facts.failures>=s.stopAfterFailures)return 'repeated-infrastructure-failure';
 // Complete admitted candidate decisions and lesson turns before stopping admission.
 if(facts.outcomes.some(o=>!o.decided || !p.lessons.some((l:any)=>l.nodeId===o.nodeId)))return null;
 if(facts.noGain>=s.stopAfterNoGain)return 'no-gain';
 const incumbent=p.evaluations.filter((e:any)=>e.state==='completed'&&e.validity==='valid'&&e.candidateOid===r.material.incumbent).at(-1);
 if(s.target!==null && incumbent){const scores=incumbent.invocations.filter((i:any)=>i.condition==='candidate'&&i.role!=='judge'&&i.valid&&i.score!==null).map((i:any)=>units(i.score));if(scores.length){const sum=scores.reduce((a:bigint,b:bigint)=>a+b,0n),target=units(s.target)*BigInt(scores.length);if(r.spec.config.objective.direction==='maximize'?sum>=target:sum<=target)return 'target';}}
 if(r.attemptsUsed>=l.attempts)return 'attempt-budget';
 if(facts.evaluatorCalls+evaluationCapacity(p)>l.evaluatorCalls)return 'evaluator-budget';
 return null;
}
export function researchObservation(p: Record<string, any>, bytes: number) {
 const facts=researchFacts(p), r=p.run;
 const recent=facts.outcomes.slice(-8), relevant=new Set(recent.map(o=>o.nodeId));
 const nodes=p.nodes.filter((n:any)=>!n.pruned).slice(-16);
 for(const n of nodes){relevant.add(n.nodeId);if(n.parentId)relevant.add(n.parentId);}
 return {research:true,currentIncumbent:r.material.incumbent,frontier:nodes, nodes, attempts:p.attempts.slice(-8), recentFacts:recent,
  evidence:p.evaluations.slice(-8).map((e:any)=>({id:e.id,baselineOid:e.baselineOid,candidateOid:e.candidateOid,state:e.state,validity:e.validity,quality:e.quality,analysis:e.analysis,invocationIds:e.invocations.map((i:any)=>i.id).slice(-32)})),
  nativeEvidence:(p.artifact_refs??[]).filter((e:any)=>e.kind==='native-evidence').slice(-8), decisions:p.decisions.slice(-12),ancestors:p.lessons.filter((l:any)=>relevant.has(l.nodeId)).slice(-8),controls:p.controls.slice(-8),steering:r.steering,
  facts, budgets:{attempts:r.spec.config.limits.attempts-r.attemptsUsed,evaluatorCalls:r.spec.config.limits.evaluatorCalls-facts.evaluatorCalls,evaluationCapacity:evaluationCapacity(p),artifactBytes:r.spec.config.limits.artifactBytes-bytes,activeMs:r.spec.config.limits.activeMs-r.activeMs-(r.activeSince===null?0:Date.now()-r.activeSince),tokens:'observational; unavailable aggregate',cost:'observational; unavailable aggregate'},
  scope:r.spec.config.material.mutablePaths, materialKind:r.spec.config.material.kind};
}
/** Admission accounting of owned disk artifacts, including Git, bundles and evaluation inputs.
 * Symlinks are counted, never followed. Trusted native writers can overshoot between boundaries.
 */
export async function artifactBytes(directory:string, ceiling:number):Promise<number>{
 let bytes=0, entries=0;const pending=[directory];
 while(pending.length){const path=pending.pop()!;let stat;try{stat=await lstat(path);}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')continue;throw e;}
  if(++entries>100000)return ceiling;
  if(stat.isDirectory())for(const name of await readdir(path))pending.push(join(path,name));else bytes+=stat.size;
  if(bytes>=ceiling)return bytes;
 }return bytes;
}

/** Charge owned files plus canonical retained SQLite evaluator/log and native-evidence
 * records. Derived JSON copies are additional owned bytes, not substitutes for the
 * mandatory records. Shared DB pages/WAL and native runtime storage are excluded.
 * Pending completion/check output replaces its saved record for pre-effect checks.
 */
export async function ownedArtifactBytes(store: ResearchStore, runId: string, pending?: EvaluationRecord): Promise<number> {
 const run=store.get(runId)!, ceiling=run.spec.config.limits.artifactBytes;
 const disk=await artifactBytes(join(dirname(store.path),'runs',runId),ceiling);
 const records=store.evaluations(runId).filter(e=>e.id!==pending?.id);if(pending)records.push(pending);
 return disk+Buffer.byteLength(canonical(records))+Buffer.byteLength(canonical(store.projection(runId)?.artifact_refs ?? []));
}
export class NativeAdmissionError extends Error {
 constructor(readonly reason: 'artifact-budget'|'active-time-budget'){super(`Native effect admission stopped: ${reason}`);}
}
export async function nativeAdmission(store: ResearchStore, runId: string, pending?: EvaluationRecord): Promise<{bytes:number;reason:'artifact-budget'|'active-time-budget'|null}> {
 const bytes=store.get(runId)!.spec.config.execution==='research'?await ownedArtifactBytes(store,runId,pending):0, run=store.get(runId)!;
 return {bytes,reason:bytes>=run.spec.config.limits.artifactBytes?'artifact-budget':run.activeMs+(run.activeSince===null?0:Date.now()-run.activeSince)>=run.spec.config.limits.activeMs?'active-time-budget':null};
}
export async function requireNativeAdmission(store: ResearchStore, runId: string, pending?: EvaluationRecord): Promise<void> {
 const {reason}=await nativeAdmission(store,runId,pending);if(reason)throw new NativeAdmissionError(reason);
}
