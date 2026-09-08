import {randomUUID} from 'node:crypto';
import {id,validate} from '../research/contracts.js';
import {join} from 'node:path';
import {getAgentDir,type ExtensionCommandContext,type ExtensionAPI} from '@earendil-works/pi-coding-agent';
import {configurationPath,readConfiguration} from '../managed/setup.js';
import {configFile,resolveSpec,resolveConfiguration} from '../research/spec.js';
import {SourceView,reportMarkdown} from './SourceView.js';
import {researchCommand,type CommandRequest} from '../research/commands.js';
import {ReadOnlyServer} from './ReadOnlyServer.js';

/** Session-only selection and listener lifetime, never research/execution truth. */
export class PiPresentation {
  #server:ReadOnlyServer|undefined;
  #selected=new Map<string,string>();
  #epoch=0;
  #starting:{directory:string;promise:Promise<ReadOnlyServer>}|undefined;
  #closing:Promise<void>|undefined;
  constructor(readonly pi:ExtensionAPI,readonly activeDirectory?:()=>string|undefined){}
  close():Promise<void>{
    this.#epoch++;if(this.#closing)return this.#closing;
    const server=this.#server,starting=this.#starting;this.#server=undefined;
    const closing=(async()=>{await Promise.all([server?.close(),starting?.promise.catch(()=>undefined)]);})();
    this.#closing=closing;void closing.finally(()=>{if(this.#closing===closing)this.#closing=undefined;}).catch(()=>undefined);return closing;
  }
  #assertCurrent(epoch:number):void { if(epoch!==this.#epoch||this.#closing)throw new Error('Browser/command request retired'); }
  async #listener(view:SourceView,requestEpoch:number):Promise<ReadOnlyServer>{
    this.#assertCurrent(requestEpoch);
    if((this.#server&&this.#server.view.directory!==view.directory)||(this.#starting&&this.#starting.directory!==view.directory)){const replacementEpoch=this.#epoch+1;await this.close();this.#assertCurrent(replacementEpoch);}
    if(this.#server)return this.#server;
    if(this.#starting)return this.#starting.promise;
    const epoch=this.#epoch;
    const promise=(async()=>{const server=await ReadOnlyServer.start(view);if(epoch!==this.#epoch){await server.close();throw new Error('Browser listener startup retired');}this.#server=server;return server;})();
    this.#starting={directory:view.directory,promise};
    void promise.finally(()=>{if(this.#starting?.promise===promise)this.#starting=undefined;}).catch(()=>undefined);
    return promise;
  }
  async source(context:ExtensionCommandContext):Promise<SourceView|undefined>{
    const global=await readConfiguration(join(getAgentDir(),'fabric.json'));
    const local=context.isProjectTrusted()?await readConfiguration(configurationPath(context.cwd)):{};
    const entries=(local.components??global.components??[]) as Array<any>;
    const selected=entries.filter(e=>e.component==='arbor');
    if(selected.length!==1||typeof selected[0]?.config?.stateDirectory!=='string'){if(this.activeDirectory?.())throw new Error('Configured research store differs from active owner. Reload before presentation or commands.');return undefined;}
    const configured=selected[0].config.stateDirectory,active=this.activeDirectory?.();
    if(this.activeDirectory&&(!active||active!==configured))throw new Error('Configured research store differs from active owner. Reload before presentation or commands.');
    return new SourceView(active??configured);
  }
  async intake(context:ExtensionCommandContext):Promise<CommandRequest|undefined>{
    const requestEpoch=this.#epoch;this.#assertCurrent(requestEpoch);
    if(!context.hasUI)throw new Error('Start needs a configured explicit request or owning-Pi intake UI');
    const profile=await configFile(join(getAgentDir(),'arbor.defaults.json')),project=await configFile(join(context.cwd,'arbor.config.json'));
    const overrides:Record<string,any>={};
    // Resolve configuration without creating run state. Defer evaluation loading
    // until missing consequential fields have been supplied.
    const preview=await resolveConfiguration(context.cwd,profile,project,{});this.#assertCurrent(requestEpoch);
    const c=preview.config;
    if(c.evaluator.definition==='unconfigured'){
      const definition=await context.ui.input('Development evaluation definition','Absolute or project-relative existing JSON file');this.#assertCurrent(requestEpoch);if(!definition)return;
      const kind=await context.ui.select('Evaluator kind',['command','agent-suite','provider']);this.#assertCurrent(requestEpoch);if(!kind)return;
      overrides.evaluator={definition,kind};
    }
    if(!c.material.mutablePaths.length){const value=await context.ui.input('Mutable material paths','Comma-separated exact relative paths');this.#assertCurrent(requestEpoch);if(!value)return;overrides.material={mutablePaths:value.split(',').map(s=>s.trim()).filter(Boolean)};}
    if(preview.origins['material.selectedUntracked']==='built-in'){const selected=await context.ui.input('Selected untracked or non-Git material files (optional)','Comma-separated exact relative paths. Blank selects no extra files.');this.#assertCurrent(requestEpoch);if(selected===undefined)return;overrides.material={...overrides.material,selectedUntracked:selected.split(',').map(s=>s.trim()).filter(Boolean)};}
    if(preview.origins['objective.description']==='built-in'){const description=await context.ui.input('Research objective','What should improve?');this.#assertCurrent(requestEpoch);if(!description)return;overrides.objective={description};}
    if(preview.origins['objective.direction']==='built-in'){const direction=await context.ui.select('Metric direction',['maximize','minimize']);this.#assertCurrent(requestEpoch);if(!direction)return;overrides.objective={...overrides.objective,direction};}
    if(c.objective.unit==='unspecified'){const unit=await context.ui.input('Metric unit','Exact evaluator unit');this.#assertCurrent(requestEpoch);if(!unit)return;overrides.objective={...overrides.objective,unit};}
    overrides.execution='research';
    if(preview.origins['roleTools.executor']==='built-in')overrides.roleTools={executor:['read','write','edit','bash']};
    const resolved=await resolveSpec(context.cwd,profile,project,overrides,context.model?`${context.model.provider}/${context.model.id}`:undefined);
    this.#assertCurrent(requestEpoch);const summary={material:resolved.config.material,objective:resolved.config.objective,development:resolved.evaluation,heldOut:resolved.validation??null,models:resolved.roles,limits:resolved.config.limits,enforcement:resolved.enforcement,search:resolved.config.search,preset:resolved.presetSource??null};
    if(!await context.ui.confirm('Start bounded research on current material?',JSON.stringify(summary,null,2)+'\nDirty material is captured without changing source/index. No automatic source apply. Costs are observational.'))return;this.#assertCurrent(requestEpoch);
    return researchCommand('start',JSON.stringify({runId:`run-${randomUUID()}`,overrides,expectedSpecId:resolved.identity}));
  }
  async prepare(operation:string,raw:string,context:ExtensionCommandContext):Promise<CommandRequest|undefined>{
    const requestEpoch=this.#epoch;this.#assertCurrent(requestEpoch);
    if(operation==='scaffold')return researchCommand(operation,raw);
    if(operation==='start'){const request=raw?researchCommand(operation,raw):await this.intake(context);this.#assertCurrent(requestEpoch);if(request){const view=await this.source(context);this.#assertCurrent(requestEpoch);if(view)this.#selected.set(view.directory,String(request.args.runId));}return request?{...request,background:true}:undefined;}
    const view=await this.source(context);this.#assertCurrent(requestEpoch);const runs=view?.runs()??[];
    const words=raw.trim().split(/\s+/u),flag=words[0]==='--run';
    if(flag){if(!words[1])throw new Error('--run requires an exact saved run');words.shift();}
    const first=words[0];let validId=false;try{validate(id,first);validId=true;}catch{/* Free text is not a run identifier. */}
    const reservedFormat=operation==='export'&&['json','report','trajectory'].includes(first??'')&&words.length===1&&!flag;
    const found=!reservedFormat&&validId?view?.project(first!):null;
    if(!flag&&found&&['steer','lessons'].includes(operation))throw new Error('Ambiguous text matches a saved run. Use --run RUN followed by the instruction or query.');
    const runOnly=['show','browser','pause','resume','cancel','revise-roles'].includes(operation);
    const explicitRun=flag||!!found||(runOnly&&!!raw.trim());
    if(explicitRun&&!found)throw new Error('Unknown explicit research run; no other run selected');
    const key=view?.directory??context.cwd;
    const inventory=view?.ownedRunSelection(context.sessionManager.getSessionId())??{total:0,runs:[]};
    const eligible=inventory.runs;
    let runId=explicitRun?first:this.#selected.get(key);
    if(runId&&!view?.project(runId)){this.#selected.delete(key);runId=undefined;}
    if(!runId&&inventory.total===1)runId=eligible[0]!.id;
    if(!runId&&operation!=='dashboard'&&inventory.total>1){
      if(!context.hasUI)throw new Error('Multiple research runs. Select a run in owning Pi or supply its ID.');
      const labels=eligible.map(r=>`${r.id} · ${r.state} · ${r.spec.config.objective.description}`);const selected=await context.ui.select('Select research run for '+operation+(inventory.total>eligible.length?' (latest 128 shown, use --run for older runs)':''),labels);if(!selected)return;this.#assertCurrent(requestEpoch);runId=eligible[labels.indexOf(selected)]!.id;
    }
    if(operation==='dashboard'){
      if(!runs.length){context.ui.setWidget('arbor',['Arbor launch card','Current material: '+context.cwd,'Active Pi model: '+(context.model?`${context.model.provider}/${context.model.id}`:'unknown'),'Use /arbor start for objective, evaluation, mutable scope and bounded budgets. /arbor setup then /reload if unconfigured.']);return;}
      if(!context.hasUI){process.stdout.write(JSON.stringify(view!.project(runId!))+'\n');return;}
      const options=runs.map(r=>`${r.id} · ${r.state} · ${r.spec.config.objective.description}`);
      const selected=await context.ui.select('Arbor research runs',options);if(!selected)return;this.#assertCurrent(requestEpoch);runId=runs[options.indexOf(selected)]!.id;operation='show';raw=runId;
    }
    if(!runId||!view)throw new Error('No current research run. Use /arbor setup, /reload, /arbor start.');
    const p=view.project(runId);if(!p)throw new Error('Unknown current research run');this.#selected.set(key,runId);
    const detail=explicitRun?words.slice(1).join(' '):raw.trim();
    if(operation==='browser'){
      if(p.run.owner.sessionId!==context.sessionManager.getSessionId())throw new Error('Start the browser listener from the owning Pi session');
      const server=await this.#listener(view,requestEpoch);
      if(this.#server!==server||this.#closing)throw new Error('Browser listener retired before notification');
      context.ui.notify('Arbor read-only browser: '+server.url+'/?run='+encodeURIComponent(runId),'info');return;
    }
    if(operation==='show'){
      if(!context.hasUI){process.stdout.write(JSON.stringify(p)+'\n');return;}
      context.ui.setWidget('arbor',[`Arbor ${runId} · revision ${p.run.revision} · ${p.run.state}`,`Incumbent ${p.run.material?.incumbent??'unscored'} · ${p.run.execution}`,`Pending review: ${p.run.pendingDecisionId??'none'} · ${p.run.error??'no recorded failure'}`]);
      const candidates=p.attempts.map((a:any)=>`Candidate ${a.id} · ${a.state}`);
      const choice=await context.ui.select('Research evidence at revision '+p.run.revision,[...candidates,'Report and uncertainty','Native Fabric topology','Open read-only browser']);
      if(!choice)return;this.#assertCurrent(requestEpoch);
      if(choice==='Native Fabric topology'){this.pi.sendUserMessage('/fabric dashboard',{expandPromptTemplates:true,...(!context.isIdle()?{deliverAs:'followUp' as const}:{})});return;}
      if(choice==='Open read-only browser'){this.#assertCurrent(requestEpoch);return this.prepare('browser',runId,context);}
      if(choice==='Report and uncertainty'){await context.ui.editor('Read-only research report (edits are not saved)',reportMarkdown(p));return;}
      const attempt=p.attempts[candidates.indexOf(choice)];
      let diff;try{diff=view.diff(runId,attempt.id,p.run.revision);}catch(e){diff={error:String(e)};}
      await context.ui.editor(`Candidate ${attempt.id}: diff, evidence and native log reference (read-only)`,JSON.stringify({revision:p.run.revision,attempt,diff,evaluations:p.evaluations.filter((e:any)=>e.attemptId===attempt.id),nativeLog:attempt.nativeId?`/fabric log ${attempt.nativeId}`:'unknown native handle'},null,2));
      this.#assertCurrent(requestEpoch);if(attempt.nativeId)context.ui.setEditorText(`/fabric log ${attempt.nativeId}`);return;
    }
    let target=detail;let selectedRevision:number|undefined;
    if(!target&&['review','apply','undo-apply','keep','discard','validate','continue-partial','restart-parent'].includes(operation)){
      if(operation==='review')target=p.run.pendingDecisionId??'';
      else {
        const latest=p.attempts.filter((a:any,index:number,rows:any[])=>!rows.slice(index+1).some(b=>b.nodeId===a.nodeId));
        const undoRows:any[]=[];
        if(operation==='undo-apply'){
          const records=[];for(const ref of p.artifact_refs.filter((a:any)=>a.kind==='source-operation'))records.push({ref,journal:JSON.parse((await view.artifact(runId,ref.id)).toString('utf8'))});
          this.#assertCurrent(requestEpoch);const undone=new Set(records.filter(r=>r.journal.intent.kind==='undo'&&r.journal.state==='applied').map(r=>r.journal.intent.parent));
          for(const {ref,journal} of records)if(journal.intent.kind==='apply'&&journal.state==='applied'&&!undone.has(journal.intent.operationId)&&!undoRows.some(r=>r.operationId===journal.intent.operationId))undoRows.push({...ref,operationId:journal.intent.operationId});
        }
        const rows=operation==='apply'?p.decisions.filter((d:any)=>d.status==='measured-keep'&&p.evaluations.some((e:any)=>d.evidenceIds.includes(e.id)&&e.candidateOid===p.run.material?.incumbent)):operation==='undo-apply'?undoRows:['keep','discard'].includes(operation)?latest.filter((a:any)=>operation==='discard'?['completed','failed','stopped','timed_out'].includes(a.state):a.state==='completed'):p.attempts;
        if(!rows.length)throw new Error('No eligible recorded selection');
        if(!context.hasUI)throw new Error('Selection requires the owning Pi UI or an explicit target');
        const labels=rows.map((r:any)=>`${r.id??r.decisionId??r.commandId} · ${r.state??r.status??r.kind}`);
        const selected=await context.ui.select('Select '+operation,labels);if(!selected)return;this.#assertCurrent(requestEpoch);const row=rows[labels.indexOf(selected)];selectedRevision=p.run.revision;
        target=['keep','discard'].includes(operation)?row.nodeId:operation==='apply'?row.decisionId:operation==='undo-apply'?row.operationId:row.id;
      }
      if(['continue-partial','restart-parent'].includes(operation)){const summary=await context.ui.input('Same-hypothesis continuation summary');if(!summary)return;target+=' '+summary;}
    }
    if(operation==='steer'&&!target){const instruction=await context.ui.input('Steer subsequent research');if(!instruction)return;target=instruction;}
    this.#assertCurrent(requestEpoch);
    return {...(operation==='resume'?{background:true}:{}),...researchCommand(operation,runId+(target?' '+target:'')),...(selectedRevision===undefined?{}:{selectionRevision:selectedRevision})};
  }
}
