// THROWAWAY #8 v2. Only the decision data, never a user-facing state dump.
export type ModelChoice = {provider:string; id:string};
export const modelId=(m:ModelChoice)=>`${m.provider}/${m.id}`;
export type PiModels = {active?:string; available:string[]};
export type Preferences = {model:string|null; experiments:number; minutes:number; evaluations:number};
export type Settings = Partial<Preferences>;
export type Scope = 'project'|'profile';
export const defaults:Preferences={model:null,experiments:5,minutes:2,evaluations:20};
export type Evaluation = {name:string; measure:string; constraint:string; revision:number; minimumMinutes:number; minimumCalls:number};
export const benchmark:Evaluation={name:'Existing duplicate-removal benchmark',measure:'Execution time in milliseconds, lower is better',constraint:'Return the same results',revision:1,minimumMinutes:1,minimumCalls:2};
export type Draft={goal:string; evaluation?:Evaluation; limits:Partial<Preferences>; reviewed?:Snapshot};
export type Snapshot={goal:string; evaluation:Evaluation; model:string; experiments:number; minutes:number; evaluations:number};
export type Memory={profile:Settings; projects:Record<string,Settings>; runs:Array<{id:string; project:string; saved:Snapshot}>};
export const initial=():Memory=>({profile:{},projects:{},runs:[]});
export function preferences(memory:Memory,project:string,scope:Scope='project',draft?:Settings):Preferences{
  return {...defaults,...(scope==='profile'?draft??memory.profile:memory.profile),...(scope==='project'?draft??memory.projects[project]??{}:{})};
}
export function resolved(memory:Memory,project:string,draft:Draft,models:PiModels):Preferences{
  const p={...preferences(memory,project),...draft.limits};return {...p,model:p.model??models.active??null};
}
export function limitProblem(p:Preferences,e?:Evaluation):string|undefined{
  if([p.experiments,p.minutes,p.evaluations].some(v=>!Number.isSafeInteger(v)||v<=0))return 'Use positive, finite whole numbers for run limits.';
  if(e&&p.minutes<e.minimumMinutes)return `This evaluation needs at least ${e.minimumMinutes} active minutes. The current limit is ${p.minutes}.`;
  if(e&&p.evaluations<e.minimumCalls)return `Baseline and candidate checks need at least ${e.minimumCalls} evaluations. The current limit is ${p.evaluations}.`;
}
export function snapshot(memory:Memory,project:string,draft:Draft,models:PiModels):Snapshot|undefined{
  const p=resolved(memory,project,draft,models);
  if(!draft.goal.trim()||!draft.evaluation||!p.model||!models.available.includes(p.model)||limitProblem(p,draft.evaluation))return;
  return {goal:draft.goal,evaluation:structuredClone(draft.evaluation),model:p.model,experiments:p.experiments,minutes:p.minutes,evaluations:p.evaluations};
}
export function differences(a:Snapshot,b:Snapshot):string[]{
  const changes:string[]=[];
  if(a.goal!==b.goal)changes.push(`Goal: ${a.goal} → ${b.goal}`);
  if(a.model!==b.model)changes.push(`Model: ${a.model} → ${b.model}`);
  for(const [key,label] of [['experiments','Experiments'],['minutes','Active minutes'],['evaluations','Evaluations']] as const)if(a[key]!==b[key])changes.push(`${label}: ${a[key]} → ${b[key]}`);
  if(JSON.stringify(a.evaluation)!==JSON.stringify(b.evaluation))changes.push(`Evaluation changed: ${a.evaluation.name}. Review the updated measurement and constraints.`);
  return changes;
}
export function freeze(memory:Memory,project:string,reviewed:Snapshot,current:Snapshot):boolean{
  if(differences(reviewed,current).length)return false;
  memory.runs.push({id:`Demo run ${memory.runs.length+1}`,project,saved:structuredClone(current)});return true;
}
