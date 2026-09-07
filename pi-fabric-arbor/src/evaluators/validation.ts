import { canonical, closed, enumeration, integer, nullable, validate, type Schema } from '../research/contracts.js';
import { definitionSchema, validateDefinition, type EvaluationDefinition, type EvaluationRecord } from './contracts.js';
import type { ResearchRun } from '../research/ResearchStore.js';
import { promotionGate } from '../material/acceptance.js';
import type { ResolvedSpec } from '../research/spec.js';
export type Split = 'development' | 'held-out' | 'final';
export interface ValidationPolicy { version:1; policy:'selected'|'final'; maxUses:number; criterion:'non-regression'|'gain'; heldOut:EvaluationDefinition; final:EvaluationDefinition|null }
export function validationSchema():Schema {return closed({version:integer(1,1),policy:enumeration('selected','final'),maxUses:integer(100,1),criterion:enumeration('non-regression','gain'),heldOut:definitionSchema(),final:nullable(definitionSchema())});}
export function validationPolicy(input:unknown,development:EvaluationDefinition):ValidationPolicy {
 validate(validationSchema(),input);const v=structuredClone(input) as ValidationPolicy;
 const splits=[development,validateDefinition(v.heldOut),...(v.final?[validateDefinition(v.final)]:[])];
 if(v.policy==='final'&&v.maxUses!==1)throw new Error('Final-only policy has exactly one use');
 if(v.policy==='final'&&v.final)throw new Error('Final-only policy uses heldOut as its untouched final split; no adaptive split');
 const ids=new Set<string>();
 for(const d of splits){
  if(d.kind!==development.kind||canonical(d.subject)!==canonical(development.subject))throw new Error('Split evaluator kind and subject configuration must agree');
  if(canonical(d.baseline)!==canonical(development.baseline)||canonical(d.candidate)!==canonical(development.candidate))throw new Error('Split exact material references must agree');
  for(const t of d.tasks){if(ids.has(t.id))throw new Error('Development/held-out/final task IDs must be disjoint');ids.add(t.id);}
 }
 return v;
}
export const splitOf=(e:{split?:Split})=>e.split??'development';
export function splitDefinition(spec:ResolvedSpec,split:Split):EvaluationDefinition|null {return split==='development'?spec.evaluation:split==='held-out'?spec.validation?.heldOut??null:spec.validation?.policy==='final'?spec.validation.heldOut:spec.validation?.final??null;}
export function validationProjection(run:ResearchRun, records:EvaluationRecord[], decisions:Array<{status:string;evidenceIds:string[]}>){
 const v=run.spec.validation, kept=decisions.filter(d=>d.status==='measured-keep').at(-1);
 const dev=kept&&records.find(e=>splitOf(e)==='development'&&kept.evidenceIds.includes(e.id)&&e.snapshots.candidate.oid===run.material?.incumbent);
 const historic=dev&&{...run,material:{...run.material!,incumbent:dev.snapshots.baseline.oid}};
 const valid=!!(v&&dev&&historic&&promotionGate(historic,dev,dev.snapshots.candidate.oid,records)==='eligible');
 return {label:valid?(validationEvidence(records,dev!,'final')?'final-validated':'held-out-validated'):'development-only',heldOutUses:validationUses(records,'held-out'),maxUses:v?.maxUses??0,finalUses:validationUses(records,'final'),policy:v?.policy??null,limitation:'Development-only is not transfer evidence. Held-out uses are adaptive reuse, not pristine final generalization. Trusted local workers can access local files; no sealed-data claim.'};
}
export function splitCapacity(d:EvaluationDefinition|null):number {return d?2*d.tasks.length*d.repeats*(d.retries+1)*(1+(d.judge?1:0)+(d.command?.checks.length??0)):0;}
export function validationUses(records:EvaluationRecord[],split:Split):number {return records.filter(e=>splitOf(e)===split&&e.attemptId).length;}
export function validationEvidence(records:EvaluationRecord[],development:EvaluationRecord,split:Split):EvaluationRecord|undefined {return records.filter(e=>splitOf(e)===split&&e.developmentId===development.id&&e.attemptId===development.attemptId&&e.epoch===development.epoch&&e.specId===development.specId&&canonical(e.definition.baseline)===canonical(development.definition.baseline)&&canonical(e.definition.candidate)===canonical(development.definition.candidate)).at(-1);}
