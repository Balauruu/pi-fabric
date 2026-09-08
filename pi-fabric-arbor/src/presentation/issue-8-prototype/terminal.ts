// THROWAWAY issue #8. Standalone terminal, no Pi API, file writes or execution.
import {createInterface} from 'node:readline';
import {initial, step, effective, blockers, summary, type State} from './model.ts';
const bold=(x:string)=>`\x1b[1m${x}\x1b[0m`;
export function frame(s:State){
  const c=effective(s,!!s.settings), rows=[bold('THROWAWAY #8 — launch/settings state model'),`State: ${s.phase} | review: ${s.review?'shown':'not confirmed'} | editing: ${s.settings?.scope??(s.phase==='draft'?'new run':'closed draft, not saved run')}`,`Goal: ${s.goal}`,`Context: ${s.clear?'latency benchmark → minimize ms, preserve correctness':'unclear, focused question required'}`];
  for(const [key,value] of Object.entries(c.values))rows.push(`${key}: ${value||'(missing)'} [${c.origins[key]}]`);
  rows.push(`Layers: preset=${JSON.stringify(s.preset)} profile=${JSON.stringify(s.profile)} project=${JSON.stringify(s.project)}`,`Edits: ${JSON.stringify(s.edits)} | staged: ${JSON.stringify(s.settings?.draft??null)}`,`Catalog: ${JSON.stringify(s.catalog)} | active: ${s.activeModel||'(missing)'}`,`Scope: inferred parser; benchmark protected. Autonomous. Separate final apply.`,`Limits: attempts/calls admitted, time/artifacts at boundaries. Cost observational.`,`Next: ${s.phase!=='draft'?'new starts another draft, settings edits future defaults.':blockers(s)[0]??'Review then explicitly confirm. Owning-Pi policy remains separate.'}`,`Notice: ${s.message}`);
  rows.push(`Saved runs: ${s.runs.map(r=>`${r.id} (${r.frozen.values.attempts} attempts)`).join(', ')||'none'}`);
  for(const run of s.runs.slice(-1)){rows.push(bold(`${run.id} FROZEN (never current defaults)`),`Goal: ${run.frozen.goal}`,`Values: ${JSON.stringify(run.frozen.values)}`,`Origins: ${JSON.stringify(run.frozen.origins)}`,`Evaluator revision: ${run.frozen.evaluatorRevision} | ${run.frozen.metric}`,`Scope: ${run.frozen.scope}`,`${run.frozen.behavior} / ${run.frozen.execution} | ${run.frozen.cost}`,`${run.frozen.permissions} | ${run.frozen.sourceApply}`);}
  rows.push(bold('scenario unclear|ready|limits|missing (reset all) · new · answer latency · narrow'),bold('set FIELD VALUE · reset FIELD · settings [project|profile] · save · cancel'),bold('review · confirm · drift [model|evaluator|unavailable] · install-evaluator · q'));
  return rows.join('\n');
}
let state=initial();
function render(){if(process.stdout.isTTY)console.clear();console.log(frame(state));}
if(process.argv.includes('--replay')){
  // Direct behavioral walkthroughs use the exact interactive dispatcher, not a test suite.
  for(const command of process.argv.slice(process.argv.indexOf('--replay')+1)){
    state=step(state,command);
    console.log(JSON.stringify({command,phase:state.phase,message:state.message,blockers:blockers(state),review:!!state.review,settings:state.settings??null,summary:summary(state),layers:{profile:state.profile,project:state.project},runs:state.runs}));
  }
} else {
  render();const input=createInterface({input:process.stdin,output:process.stdout});
  input.on('line',line=>{if(line.trim()==='q'){input.close();return;}state=step(state,line);render();});
}
