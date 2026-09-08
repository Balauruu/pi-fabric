// THROWAWAY issue #8. Pure in-memory launch/settings decision model, not native admission.
export type Config = { model: string; evaluator: string; attempts: number; evaluatorCalls: number; activeMs: number; artifactBytes: number };
export type Layer = Partial<Config>;
const defaults: Config = {model:'', evaluator:'', attempts:5, evaluatorCalls:20, activeMs:120000, artifactBytes:16777216};
export type State = {
  profile:Layer; project:Layer; preset:Layer; edits:Layer;
  settings?:{scope:'project'|'profile'; draft:Layer; base:string};
  goal:string; clear:boolean; ambitious:boolean; activeModel:string;
  catalog:{models:string[]; evaluatorRevision:number; evaluatorAvailable:boolean};
  review?:string; phase:'draft'|'cancelled'|'submitted'; message:string;
  runs:Array<{id:string; frozen:ReturnType<typeof summary>}>;
};
export function initial():State { return {profile:{},project:{},preset:{},edits:{},goal:'Make it better',clear:false,ambitious:false,activeModel:'local/approved',catalog:{models:['local/approved','paid/explicit'],evaluatorRevision:1,evaluatorAvailable:true},phase:'draft',message:'Choose a scenario or clarify the goal.',runs:[]}; }
export function effective(s:State, settings=false) {
  const values={...defaults}, origins=Object.fromEntries(Object.keys(defaults).map(k=>[k,'built-in']));
  const scope=settings?s.settings?.scope:undefined;
  const layers:Array<[string,Layer]>=[['preset',s.preset],['profile',scope==='profile'?s.settings!.draft:s.profile]];
  if(scope!=='profile')layers.push(['project',scope==='project'?s.settings!.draft:s.project]);
  if(!settings)layers.push(['new-run edit',s.edits]);
  for(const [origin,layer] of layers)for(const key of Object.keys(layer) as Array<keyof Config>){(values as any)[key]=layer[key];origins[key]=origin;}
  if(!values.model){values.model=s.activeModel;origins.model=s.activeModel?'active Pi (already selected)':'missing';}
  if(!values.evaluator && s.clear && s.catalog.evaluatorAvailable){values.evaluator='latency';origins.evaluator='inferred: existing latency benchmark';}
  return {values,origins};
}
export function summary(s:State){return {goal:s.goal,...effective(s),metric:'minimize milliseconds; preserve correctness',scope:'inferred src/parser, protected benchmark inputs (fixture)',evaluatorRevision:s.catalog.evaluatorRevision,behavior:'autonomous',execution:'research',cost:'observational, NOT a hard spending cap',permissions:'ordinary owning-Pi admission still required',sourceApply:'separate final approval'};}
function identity(s:State){return JSON.stringify({summary:summary(s),catalog:s.catalog});}
export function blockers(s:State):string[]{
  const {values:c}=effective(s), b:string[]=[];
  if(!s.clear)b.push('Which outcome? Recommend parser latency in ms with correctness preserved. Use answer latency, or give another answer.');
  if(!c.model || !s.catalog.models.includes(c.model))b.push('Choose an available operational model explicitly. No paid fallback.');
  if(c.evaluator!=='latency' || !s.catalog.evaluatorAvailable)b.push('Select an available matching evaluator. Recommendation: existing latency benchmark.');
  for(const k of ['attempts','evaluatorCalls','activeMs','artifactBytes'] as const)if(!Number.isSafeInteger(c[k])||c[k]<=0)b.push(`${k} must be a positive bounded integer.`);
  if(c.evaluatorCalls<2)b.push('Fixture needs baseline + one candidate evaluation (2 calls). Increase calls or cancel.');
  if(s.ambitious && (c.attempts<10||c.activeMs<600000))b.push('Broad goal exceeds estimated 10 attempts / 10 min. Recommend narrow, or explicitly increase both limits. Not a success guarantee.');
  return b;
}
export function step(before:State,line:string):State {
  const s=structuredClone(before), [cmd,...words]=line.trim().split(/\s+/u), arg=words.join(' ');
  if(cmd==='scenario'){
    const n=initial(); n.clear=arg!=='unclear';n.goal=n.clear?'Reduce parser latency, preserve correctness':'Make it better';
    if(arg==='limits'){n.ambitious=true;n.goal='Optimize all parser paths, preserve correctness';}
    if(arg==='missing'){n.activeModel='';n.catalog.evaluatorAvailable=false;}
    n.message=`Fixture: ${arg}. No real inference or execution.`;return n;
  }
  if(cmd==='new'){s.phase='draft';s.edits={};s.review=undefined;s.settings=undefined;s.message='New draft using current defaults. Existing frozen runs retained.';return s;}
  if(cmd==='settings'){
    if(s.settings){s.message='Save or cancel current settings before switching scope.';return s;}
    const scope=arg==='profile'?'profile':'project';s.settings={scope,draft:structuredClone(s[scope]),base:JSON.stringify(s[scope])};s.message=`Editing ${scope} defaults, staged only.`;return s;
  }
  if(cmd==='save'&&s.settings){
    if(s.settings.base!==JSON.stringify(s[s.settings.scope])){s.message='Settings changed externally. Cancel and reopen, do not overwrite.';return s;}
    const c=effective(s,true).values;
    if(['attempts','evaluatorCalls','activeMs','artifactBytes'].some(k=>!Number.isSafeInteger(c[k as keyof Config])||Number(c[k as keyof Config])<=0)){s.message='Cannot save invalid limits. Use positive bounded integers.';return s;}
    s[s.settings.scope]=s.settings.draft;s.settings=undefined;s.message='Saved in memory for future runs only. Existing runs unchanged.';return s;
  }
  if(cmd==='cancel'){
    if(s.settings){s.settings=undefined;s.message='Settings discarded. Intake state unchanged.';}
    else if(s.phase==='draft'){s.phase='cancelled';s.edits={};s.review=undefined;s.message='Intake cancelled. No request submitted.';}
    else s.message='No pending intake. Submitted work cannot be cancelled by dismissing intake.';
    return s;
  }
  if(cmd==='drift'){
    if(arg==='model')s.activeModel='';
    else if(arg==='evaluator')s.catalog.evaluatorRevision++;
    else if(arg==='unavailable')s.catalog.evaluatorAvailable=false;
    else s.project.attempts=(s.project.attempts??5)+1;
    s.message='External fixture drift. Saved runs unchanged. Pending review may be stale.';return s;
  }
  if(cmd==='install-evaluator'){s.catalog.evaluatorAvailable=true;s.message='Fixture evaluator now available, not an actual install.';return s;}
  if(cmd==='set'||cmd==='reset'){
    if(!s.settings&&s.phase!=='draft'){s.message='Open a new scenario for a new launch.';return s;}
    const key=words[0] as keyof Config, target=s.settings?s.settings.draft:s.edits;
    if(!(key in defaults)){s.message='Fields: model evaluator attempts evaluatorCalls activeMs artifactBytes';return s;}
    if(cmd==='reset')delete target[key];
    else {const raw=words.slice(1).join(' ');(target as any)[key]=typeof defaults[key]==='number'?Number(raw):raw;}
    s.review=undefined;s.message=s.settings?'Staged settings edit. Save or cancel.':'New-run edit only. Review again.';return s;
  }
  if(s.phase!=='draft'){s.message='Intake closed. Choose a scenario to begin again.';return s;}
  if(cmd==='answer'){
    s.clear=arg==='latency';s.goal=s.clear?'Reduce parser latency, preserve correctness':arg;
    s.review=undefined;s.message=s.clear?'Inferred benchmark, metric and scope from fixture context.':'What measurable outcome? This fixture only resolves latency. No invented evaluator.';
  } else if(cmd==='narrow'){s.ambitious=false;s.clear=true;s.goal='Reduce one parser hot-path latency, preserve correctness';s.review=undefined;s.message='Narrowed goal. Bounded defaults unchanged. Review again.';}
  else if(cmd==='review'){
    const b=blockers(s);s.review=b.length||s.settings?undefined:identity(s);
    s.message=s.settings?'Save/cancel settings before review.':b.length?b[0]:'Editable summary ready. confirm submits simulated request, not permission approval.';
  } else if(cmd==='confirm'){
    if(s.settings || !s.review){s.message='Review the current summary first.';return s;}
    if(s.review!==identity(s)){s.review=undefined;s.message='Configuration drift. Review changed values and confirm again.';return s;}
    const b=blockers(s);if(b.length){s.message=b[0];return s;}
    s.runs.push({id:`simulated-${s.runs.length+1}`,frozen:structuredClone(summary(s))});s.phase='submitted';s.review=undefined;s.message='SIMULATED request submitted. Not a running native job. Frozen configuration saved in memory.';
  } else s.message='Unknown action. See controls below.';
  return s;
}
