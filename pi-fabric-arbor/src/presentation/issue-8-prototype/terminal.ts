// THROWAWAY #8 v2. Native Pi interaction study. No research execution or persistence.
import type {ExtensionAPI,ExtensionCommandContext,ExtensionContext} from '@earendil-works/pi-coding-agent';
import {benchmark,defaults,differences,freeze,initial,limitProblem,modelId,preferences,resolved,snapshot,type Draft,type Memory,type PiModels,type Preferences,type Scope,type Settings,type Snapshot} from './model.ts';

type UI=Pick<ExtensionContext,'ui'|'cwd'|'model'|'modelRegistry'|'scopedModels'>;
const title=(text:string)=>`Arbor · ${text}\nPrototype only — no research is executed`;
const label=(scope:Scope)=>scope==='project'?'This project':'Profile defaults';
const limitLine=(p:Pick<Preferences,'experiments'|'minutes'>)=>`Up to ${p.experiments} experiments · ${p.minutes} min active time`;
export function piModels(ctx:UI):PiModels{
  const available=ctx.modelRegistry.getAvailable().map(modelId);
  const scoped=ctx.scopedModels.map(({model})=>modelId(model));
  return {active:ctx.model?modelId(ctx.model):undefined,available:scoped.length?available.filter(id=>scoped.includes(id)):available};
}
async function number(ctx:UI,name:string,current:number):Promise<number|undefined>{
  const text=await ctx.ui.input(title(name),String(current));
  if(text===undefined)return;
  const value=Number(text);if(!Number.isSafeInteger(value)||value<=0){ctx.ui.notify('Enter a positive whole number. Nothing changed.','warning');return;}
  return value;
}

// Responsibility 1: conversation. This happens BEFORE any launch summary.
// Responses are authored scenario context, not real inference. No model calls.
export async function clarify(ctx:UI,goal:string):Promise<Draft|undefined>{
  let request=goal;
  while(true){
    const answer=await ctx.ui.select(title('Clarify the goal')+`\nYou: ${request}\n\nWhat should improve?\nFor this example project, I recommend speeding up duplicate removal.`,[
      'Speed up duplicate removal','Describe a different goal','Cancel request']);
    if(!answer||answer==='Cancel request')return;
    if(answer==='Describe a different goal'){
      const text=await ctx.ui.input(title('What would you like to improve?'),'Describe the outcome, not which files to edit');
      if(text===undefined)return;request=text;
      ctx.ui.notify('This prototype cannot infer an evaluation for arbitrary goals. The example conversation remains open.','info');continue;
    }
    const constraint=await ctx.ui.select(title('Clarify the trade-off')+'\nMay the result change to make duplicate removal faster?\nI recommend preserving the existing output and measuring the current benchmark.',[
      'Preserve the existing results (recommended)','I need a different trade-off','Cancel request']);
    if(!constraint||constraint==='Cancel request')return;
    if(constraint==='I need a different trade-off'){request='Speed up duplicate removal with a different trade-off';continue;}
    return {goal:'Speed up duplicate removal without changing results',evaluation:structuredClone(benchmark),limits:{}};
  }
}

// Responsibility 2: persistent-defaults editor, with staged changes and plain inheritance labels.
export async function settings(ctx:UI,memory:Memory,initialScope:Scope='project'):Promise<void>{
  let scope=initialScope;
  while(true){
    const original=structuredClone(scope==='profile'?memory.profile:memory.projects[ctx.cwd]??{});
    const staged:Settings=structuredClone(original);
    let switchScope=false;
    while(true){
      const p=preferences(memory,ctx.cwd,scope,staged);
      const source=(key:keyof Preferences)=>Object.hasOwn(staged,key)?'set here':scope==='project'&&Object.hasOwn(memory.profile,key)?'from profile defaults':'default';
      const model=p.model??`Same as Pi${piModels(ctx).active?` — ${piModels(ctx).active}`:''}`;
      const action=await ctx.ui.select(title(`Settings · ${label(scope)}`)+`\n${scope==='project'?'Changes affect new runs in this project.':'Changes affect new runs in projects that inherit these defaults.'}\nExisting runs keep their saved settings.\n\nModel: ${model} (${source('model')})\nExperiments: ${p.experiments} (${source('experiments')})\nActive minutes: ${p.minutes} (${source('minutes')})\n${JSON.stringify(staged)!==JSON.stringify(original)?'Unsaved changes — Save or Cancel.':''}`,['Research model','Run limits','Reset to inherited values',`Switch to ${scope==='project'?'profile defaults':'this project'}`,'Save settings','Cancel']);
      if(action==='Research model'){
        const models=piModels(ctx);
        const providers=[...new Set(models.available.map(id=>id.slice(0,id.indexOf('/'))))];
        const picked=await ctx.ui.select(title('Research model')+'\nChoose from Pi providers. This does not change Pi’s own model.\nDefault: inherit the active Pi model when a new run starts.',['Same as Pi (default)',...providers]);
        if(picked==='Same as Pi (default)')staged.model=null;
        else if(picked){
          const selected=await ctx.ui.select(title(`Models · ${picked}`),models.available.filter(id=>id.startsWith(picked+'/')));
          if(selected)staged.model=selected;
        }
      }else if(action==='Run limits'){
        const result=await editLimits(ctx,p,'New runs');if(result)Object.assign(staged,result);
      }else if(action==='Reset to inherited values'){
        const choice=await ctx.ui.select(title('Reset setting')+`\nRemove this ${scope==='project'?'project override':'profile override'} and use ${scope==='project'?'profile defaults':'built-in defaults'} instead.`,['Research model','Run limits','All settings','Back']);
        if(choice==='Research model'||choice==='All settings')delete staged.model;
        if(choice==='Run limits'||choice==='All settings'){delete staged.experiments;delete staged.minutes;delete staged.evaluations;}
      }else if(action==='Save settings'){
        const current=scope==='profile'?memory.profile:memory.projects[ctx.cwd]??{};
        if(JSON.stringify(current)!==JSON.stringify(original)){
          await ctx.ui.select(title('Settings changed elsewhere')+'\nYour changes were not saved. Reopen settings to work from the latest values.',['Reopen settings']);switchScope=true;break;
        }
        if(scope==='profile')memory.profile=structuredClone(staged);else memory.projects[ctx.cwd]=structuredClone(staged);
        ctx.ui.notify('Demo settings saved in memory. Existing runs are unchanged.','info');return;
      }else {
        const dirty=JSON.stringify(staged)!==JSON.stringify(original);
        if(dirty&&!await ctx.ui.confirm(title('Discard unsaved settings?'),'No saved settings or existing runs will change.'))continue;
        if(action?.startsWith('Switch to')){scope=scope==='project'?'profile':'project';switchScope=true;break;}
        return;
      }
    }
    if(!switchScope)return;
  }
}

export async function editLimits(ctx:UI,p:Preferences,where:string):Promise<Partial<Preferences>|undefined>{
  const staged={experiments:p.experiments,minutes:p.minutes,evaluations:p.evaluations};
  while(true){
    const choice=await ctx.ui.select(title(`Run limits · ${where}`)+`\n${limitLine(staged)}\nEvaluation calls: ${staged.evaluations}\nActive time is checked before new work. Cost is not a hard spending cap.`,['Experiments','Active minutes','Evaluation calls','Use these limits','Cancel']);
    if(choice==='Use these limits')return staged;
    if(!choice||choice==='Cancel')return;
    const key=choice==='Experiments'?'experiments':choice==='Active minutes'?'minutes':'evaluations';
    const value=await number(ctx,choice,staged[key]);if(value!==undefined)staged[key]=value;
  }
}

// Responsibility 3: a focused exception, not a field in the happy-path launch form.
export async function resolveLimits(ctx:UI,memory:Memory,draft:Draft):Promise<boolean>{
  while(true){
    const p=resolved(memory,ctx.cwd,draft,piModels(ctx));
    const problem=limitProblem(p,draft.evaluation);if(!problem)return true;
    const choice=await ctx.ui.select(title('The run limit is too small')+`\n${problem}\n\nNothing has started. Choose a smaller evaluation or adjust this run’s limits.`,['Adjust limits for this run','Use the shorter benchmark','Cancel request']);
    if(choice==='Adjust limits for this run'){
      const value=await editLimits(ctx,p,'This run only');if(value)Object.assign(draft.limits,value);
    }else if(choice==='Use the shorter benchmark'){
      const confirmed=await ctx.ui.confirm(title('Use the shorter benchmark?'),'This measures the standard sample rather than the full workload. The result may not generalize to the full workload.');
      if(confirmed){draft.evaluation=structuredClone(benchmark);draft.goal='Speed up duplicate removal on the standard sample without changing results';}
    }else return false;
  }
}

// Responsibility 4: missing evaluation is a measurement conversation, not JSON entry.
export async function evaluationChoice(ctx:UI,draft:Draft):Promise<boolean>{
  while(!draft.evaluation){
    const choice=await ctx.ui.select(title('How should improvement be measured?')+'\nNo suitable evaluation is available for this request.\nRecommendation: time duplicate removal and verify that its output stays the same.',[
      'Review the recommended evaluation','Describe another measurement','Cancel request']);
    if(choice==='Review the recommended evaluation'){
      if(await ctx.ui.confirm(title('Proposed evaluation'),'Time the standard duplicate-removal workload in milliseconds. Lower is better. Reject changed results.\n\nUse this evaluation? (Demo only, no benchmark is created.)'))draft.evaluation=structuredClone(benchmark);
    }else if(choice==='Describe another measurement'){
      const text=await ctx.ui.input(title('Describe the measurement'),'What would count as an improvement?');
      if(text===undefined)return false;
      ctx.ui.notify('Recorded for discussion only. This prototype cannot validate a new evaluation. Launch remains blocked.','info');
    }else return false;
  }
  return true;
}

async function modelRecovery(ctx:UI,memory:Memory,draft:Draft):Promise<boolean>{
  while(true){
    const models=piModels(ctx),p=resolved(memory,ctx.cwd,draft,models);
    if(p.model&&models.available.includes(p.model))return true;
    const choice=await ctx.ui.select(title('A Pi model is needed')+`\n${p.model?`The selected model is unavailable: ${p.model}`:'There is no available active Pi model to inherit.'}\nChoose a model in Arbor settings, or return to Pi and use /model or /login.\nNo replacement is selected automatically.`,['Open Arbor settings','Return to Pi']);
    if(choice!=='Open Arbor settings')return false;
    await settings(ctx,memory);
  }
}

function launchText(memory:Memory,ctx:UI,draft:Draft,review:Snapshot):string{
  const configured=preferences(memory,ctx.cwd).model;
  return title('Ready to start')+`\n\n${review.goal}\n\nMeasure: ${review.evaluation.name}\n${limitLine(review)}\nModel: ${configured?review.model:`Same as Pi — ${review.model}`}\n\nResearch is isolated. Applying results to source is a separate decision.`;
}

// Responsibility 5: concise launch confirmation. No clarification prompts or debug state here.
export async function launch(ctx:UI,memory:Memory,draft:Draft):Promise<void>{
  while(true){
    if(!await evaluationChoice(ctx,draft)||!await modelRecovery(ctx,memory,draft)||!await resolveLimits(ctx,memory,draft)){ctx.ui.notify('Request cancelled. Nothing started.','info');return;}
    const reviewed=snapshot(memory,ctx.cwd,draft,piModels(ctx));if(!reviewed)return;
    const choice=await ctx.ui.select(launchText(memory,ctx,draft,reviewed),['Start research','Edit goal','Adjust limits for this run','Evaluation details','Cancel request']);
    if(choice==='Start research'){
      const current=snapshot(memory,ctx.cwd,draft,piModels(ctx));
      if(!current){ctx.ui.notify('A required model, evaluation or limit changed. Resolve it before starting.','warning');continue;}
      const changes=differences(reviewed,current);
      if(changes.length){
        const action=await ctx.ui.select(title('The launch settings changed')+`\n${changes.join('\n')}\n\nNothing started. Review the updated summary before confirming.`,['Review updated summary','Cancel request']);
        if(action==='Review updated summary')continue;ctx.ui.notify('Request cancelled. Nothing started.','info');return;
      }
      freeze(memory,ctx.cwd,reviewed,current);
      ctx.ui.notify('Demo launch confirmed. No research was executed.','info');
      await savedRun(ctx,memory);return;
    }else if(choice==='Edit goal'){
      const text=await ctx.ui.editor(title('Edit this run’s goal'),draft.goal);
      if(text?.trim()&&text.trim()!==draft.goal){
        const action=await ctx.ui.select(title('Measurement for the revised goal')+`\n${text.trim()}\n\nCurrent measurement: ${reviewed.evaluation.measure}\nRequired: ${reviewed.evaluation.constraint}`,
          ['Keep this measurement','Choose a different measurement','Cancel edit']);
        if(action==='Keep this measurement')draft.goal=text.trim();
        else if(action==='Choose a different measurement'){draft.goal=text.trim();delete draft.evaluation;}
      }
    }else if(choice==='Adjust limits for this run'){
      const result=await editLimits(ctx,resolved(memory,ctx.cwd,draft,piModels(ctx)),'This run only');if(result)Object.assign(draft.limits,result);
    }else if(choice==='Evaluation details'){
      await ctx.ui.select(title('Evaluation')+`\n${reviewed.evaluation.name}\n${reviewed.evaluation.measure}\nRequired: ${reviewed.evaluation.constraint}\nEvaluation calls allowed: ${reviewed.evaluations}`,['Back to launch']);
    }else {ctx.ui.notify('Request cancelled. Nothing started.','info');return;}
  }
}

// Responsibility 6: saved runs never render current defaults as their own configuration.
export async function savedRun(ctx:UI,memory:Memory):Promise<void>{
  const runs=memory.runs.filter(r=>r.project===ctx.cwd);if(!runs.length){ctx.ui.notify('No demo run has been confirmed in this project.','info');return;}
  let run=runs.at(-1)!;
  if(runs.length>1){const selected=await ctx.ui.select(title('Saved demo runs'),runs.map(r=>`${r.id} — ${r.saved.goal}`));if(!selected)return;run=runs[runs.findIndex(r=>selected.startsWith(r.id+' —'))]!;}
  while(true){
    const s=run.saved;
    const choice=await ctx.ui.select(title(`${run.id} · Saved configuration`)+`\n${s.goal}\nModel: ${s.model}\n${limitLine(s)}\nMeasure: ${s.evaluation.name}\n\nThese values were saved at confirmation. Changing defaults does not change this run.`,['Evaluation details','Open settings for future runs','Back']);
    if(choice==='Open settings for future runs')await settings(ctx,memory);
    else if(choice==='Evaluation details')await ctx.ui.select(title('Saved evaluation')+`\n${s.evaluation.measure}\nRequired: ${s.evaluation.constraint}\nEvaluation calls allowed: ${s.evaluations}`,['Back']);
    else return;
  }
}

// Showcase controls are outside the product flows. They inject authored examples, never fake providers.
export async function showcase(ctx:UI,memory:Memory):Promise<void>{
  while(true){
    const choice=await ctx.ui.select(title('Choose an interaction to try')+'\nExample project: duplicate-removal benchmark. Model choices come from your Pi.',[
      'Ready-to-launch request','Unclear goal conversation','Run limits do not fit','Missing evaluation','No active Pi model (demo)','Settings and inheritance','Saved run configuration','Configuration changes before launch','Back to Pi']);
    const draft:Draft={goal:'Speed up duplicate removal without changing results',evaluation:structuredClone(benchmark),limits:{}};
    if(choice==='Ready-to-launch request')await launch(ctx,memory,draft);
    else if(choice==='Unclear goal conversation'){const result=await clarify(ctx,'Improve this project');if(result)await launch(ctx,memory,result);}
    else if(choice==='Run limits do not fit'){
      draft.evaluation={...benchmark,name:'Full workload benchmark',minimumMinutes:3};draft.limits.minutes=2;await launch(ctx,memory,draft);
    }else if(choice==='Missing evaluation'){delete draft.evaluation;await launch(ctx,memory,draft);}
    else if(choice==='No active Pi model (demo)'){
      const demoMemory=structuredClone(memory);demoMemory.profile.model=null;demoMemory.projects[ctx.cwd]={...demoMemory.projects[ctx.cwd],model:null};
      await launch({...ctx,model:undefined},demoMemory,draft);
    }else if(choice==='Settings and inheritance')await settings(ctx,memory);
    else if(choice==='Saved run configuration')await savedRun(ctx,memory);
    else if(choice==='Configuration changes before launch'){
      // Inject one external project-default change while the summary is open.
      let injected=false;
      const demo:UI={...ctx,ui:{...ctx.ui,select:async(...args:Parameters<UI['ui']['select']>)=>{
        const result=await ctx.ui.select(...args);
        if(args[0].includes('Ready to start')&&result==='Start research'&&!injected){
          injected=true;const p=preferences(memory,ctx.cwd);memory.projects[ctx.cwd]={...memory.projects[ctx.cwd],experiments:p.experiments+1};
        }
        return result;
      }}};
      await launch(demo,memory,draft);
    }else return;
  }
}

export default function intakePrototype(pi:ExtensionAPI){
  const memory=initial();
  pi.registerFlag('arbor-intake-demo',{description:'Open the throwaway intake showcase on startup',type:'boolean',default:false});
  pi.registerCommand('arbor-intake-prototype',{
    description:'Throwaway issue 8 native interaction study (no execution or settings persistence)',
    getArgumentCompletions:prefix=>['scenarios','start','settings','saved'].filter(v=>v.startsWith(prefix)).map(value=>({value,label:value})),
    handler:async(args:string,ctx:ExtensionCommandContext)=>{
      if(ctx.mode!=='tui'){ctx.ui.notify('Open this prototype in interactive Pi.','warning');return;}
      if(args==='settings')await settings(ctx,memory);
      else if(args==='saved')await savedRun(ctx,memory);
      else if(args==='start')await launch(ctx,memory,{goal:'Speed up duplicate removal without changing results',evaluation:structuredClone(benchmark),limits:{}});
      else await showcase(ctx,memory);
    },
  });
  pi.on('session_start',async(_event,ctx)=>{
    if(pi.getFlag('arbor-intake-demo')&&ctx.mode==='tui')await showcase(ctx,memory);
    else ctx.ui.notify('Issue 8 prototype: /arbor-intake-prototype. No research or settings writes.','info');
  });
}
