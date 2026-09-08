import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile,mkdir,appendFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {host} from '../fixtures/pr6-host.js';
import {SourceView} from '../../src/presentation/SourceView.js';

const gates=resolve('.runtime/pr12-gates');
const respond=(r:any)=>r.method==='confirm'?{confirmed:true}:r.method==='input'?{value:'PR12 exact bounded research'}:r.options?.includes('maximize')?{value:'maximize'}:{cancelled:true};
for(const installed of [false,true])test(`PR12 ${installed?'installed':'source'} direct component reload preserves held native spawn`,{timeout:180000},async t=>{
 await mkdir(gates,{recursive:true});
 const providerSource=(await readFile('tests/fixtures/pr2-fake-provider.ts','utf8'))
  .replace('pi.on("tool_result", async event => {','pi.on("tool_result", async (event,ctx) => {')
  .replace('held = true; trace("barrier.held", { ref: proxy.ref });','held = true; trace("barrier.held", { ref: proxy.ref }); ctx.ui.notify("PR12 native work held", "info");')
  .replace('  const fixture: FabricProvider =','  pi.registerCommand("pr12-release", {handler(){ release?.(); }});\n  const fixture: FabricProvider =');
 const h=await host('command',{installed,providerSource,hold:'agents.spawn',rpcJourney:async(client,root)=>{
  await client.command('/arbor start',respond);
  await client.wait(r=>r.type==='extension_ui_request'&&r.message==='PR12 native work held');
  const view=new SourceView(join(root,'state')),runId=view.runs()[0]!.id,before=view.project(runId)!;
  assert.equal(before.attempts.length,1);assert.equal(before.run.active,1);
  let reloadDone=false;
  const reloading=client.command('ARBOR_COMMAND_PROGRAM='+JSON.stringify("await components.reload({id:'arbor'});return JSON.stringify({reloaded:true});")).then(()=>{reloadDone=true;});
  void reloading.catch(()=>{});
  const trace=async()=>(await readFile(join(root,'trace.jsonl'),'utf8')).trim().split('\n').map(line=>JSON.parse(line));
  const deadline=Date.now()+15000;let stopped=false;
  while(Date.now()<deadline){stopped=(await trace()).some(e=>e.event==='native.result'&&e.data.ref==='agents.stop');if(stopped)break;await new Promise(r=>setTimeout(r,10));}
  assert.ok(stopped,'Component retirement did not begin while spawn reply was held');
  assert.equal(reloadDone,false,'Component reload returned before accepted spawn settled');
  await client.command('/pr12-release',undefined,false);await reloading;
  const after=view.project(runId)!;
  assert.deepEqual(after.run.spec,before.run.spec);assert.equal(after.run.generation,before.run.generation);
  assert.equal(after.attempts.length,1);assert.equal(after.run.active,0);
  const nativeId=after.attempts[0].nativeId;assert.ok(nativeId,'Accepted worker has no authoritative saved handle');
  const events=await trace();
  assert.ok(events.some(e=>e.event==='native.result'&&e.data.ref==='agents.wait'&&e.data.result?.id===nativeId&&['completed','failed','stopped','timed_out'].includes(e.data.result.status)),'Exact worker terminal wait was not observed');
  await client.command('ARBOR_COMMAND_PROGRAM='+JSON.stringify(`return JSON.stringify({p:await tools.call({ref:'arbor.inspect',args:{runId:${JSON.stringify(runId)}}})});`));
 }});
 t.after(()=>h.store.close());
 assert.equal(h.value.p.run.active,0);
 await appendFile(join(gates,'component-reload.jsonl'),JSON.stringify({root:h.root,installed,hold:'agents.spawn',active:h.value.p.run.active,nativeId:h.value.p.attempts[0].nativeId,actualComponentReload:true})+'\n');
});
