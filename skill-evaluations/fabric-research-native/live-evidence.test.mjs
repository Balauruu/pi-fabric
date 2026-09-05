// Assertions over actual native results, not mocked agents or retrieval.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
const root='/home/balauru/.pi-profiles/fabric';
const base=`${root}/skill-evaluations/fabric-research-native`;
const json=f=>JSON.parse(readFileSync(`${base}/${f}`,'utf8'));
const receipt=json('live-canonical-receipt.json');
const field=receipt.researchReceipt.lineage.find(r=>r.streamId==='sqlite-field');
const trace=id=>json(`trace-${id}.json`);
function calls(t){
 const map=new Map();
 for(const {event:e} of t.events){
  const messages=e.type==='agent_end'?e.messages:e.type==='message_end'?[e.message]:[];
  for(const m of messages??[]) if(m?.role==='assistant') for(const c of m.content??[]) if(c.type==='toolCall') map.set(c.id,c);
 }
 return [...map.values()];
}

test('fresh ordinary Pi exposes skill command without QA registrations',()=>{
 const events=readFileSync(`${base}/fresh-commands.jsonl`,'utf8').trim().split('\n').map(JSON.parse);
 const response=events.find(e=>e.command==='get_commands'); assert.equal(response.success,true);
 const commands=response.data.commands;
 assert.equal(commands.find(c=>c.name==='skill:fabric-research').sourceInfo.path,`${root}/skills/fabric-research/SKILL.md`);
 assert.ok(!commands.some(c=>/^qa(?:\b|:)|research_(?:search|fetch)/.test(c.name)));
 const child=json('profile-child-receipt.json');assert.equal(child.status,'completed');assert.equal(child.transport,'process');assert.equal(child.value.profile,root);
 for(const name of ['browser','web_search','fetch_content','get_search_content','source_check']) assert.ok(child.value.tools.includes(`functions.${name}`));
});

test('existing direct retrieval succeeds and inaccessible source remains a gap',()=>{
 assert.equal(json('direct-route.json').childCalls,0);
 assert.equal(json('direct-search.json').details.successfulQueries,1);
 assert.equal(json('direct-fetch.json').details.successful,1);
 assert.equal(json('direct-passage.json').details.findMode,'exact');assert.equal(json('direct-passage.json').details.matchCount,1);
 assert.equal(json('failed-fetch.json').details.successful,0);assert.match(json('failed-fetch.json').details.error,/ENOTFOUND/);
 // isError false is not success: existing tool carries failure in details/text.
 assert.equal(json('failed-fetch.json').isError,false);
 assert.equal(json('direct-source-check.json').details.artifact.provider,'exa');
 assert.equal(json('direct-source-check.json').details.artifact.claims[0].status,'unclear');
});

test('canonical native attempts, receipts, helper budget and sibling retention',()=>{
 const r=receipt.researchReceipt;
 assert.equal(receipt.status,'partial');assert.equal(r.dispatchAttempts,3);assert.equal(r.lineage.length,2);assert.equal(r.unreceiptedAttempts,1);
 assert.equal(receipt.outcomes[0].status,'completed-usable');assert.equal(receipt.outcomes[2].status,'failed-budget');assert.equal(receipt.outcomes[2].attemptReceipt,null);
 assert.equal(r.coverage.retryAttempts,0);assert.equal(r.tokenBudgetObservation.total,1);assert.equal(r.tokenBudgetObservation.spent,0);assert.equal(r.tokenBudgetObservation.appliesToRawAgentsRun,false);
 for(const child of r.lineage){assert.match(child.agentId,/^[a-f0-9]{32}$/);assert.equal(child.runner,'pi');assert.equal(child.terminalStatus,'completed');assert.ok(child.usage.output>0);}
 assert.equal(r.usage.children,'unavailable');assert.equal(r.toolCalls.children,'unavailable');
 assert.ok(!receipt.outcomes[1].report.evidence[0].provenance.retrievedAtUTC);assert.equal(receipt.outcomes[1].status,'completed-no-usable-evidence');
});

test('actual native schema failure leaves successful sibling intact',()=>{
 const [ok,bad]=json('native-worker-failure.json');assert.equal(ok.status,'completed');assert.deepEqual(ok.value,{x:'ok'});assert.equal(bad.status,'failed');assert.match(bad.error,/Structured agent output/);
 assert.ok(bad.usage.output>0);assert.equal(bad.turns,1);assert.equal(ok.toolCalls+bad.toolCalls,0);
});

test('current-field actually ran declared engine once with scoped artifacts and both opt-outs',()=>{
 const t=trace(field.agentId);const commands=calls(t).filter(c=>c.name==='bash').map(c=>c.arguments.command);
 const runs=commands.filter(c=>/last30days\.py ['"]SQLite database reliability/.test(c));assert.equal(runs.length,1);
 const cmd=runs[0];for(const s of ['skills/last30days/.venv/bin/python -B','PYTHONDONTWRITEBYTECODE=1','LAST30DAYS_CONFIG_DIR="$A/config"','LAST30DAYS_MEMORY_DIR="$A/raw"','TMPDIR="$A/tmp"','LAST30DAYS_TRUSTPILOT_NO_BROWSER=1','LAST30DAYS_NATIVE_SEARCH=1','--no-browser-cookies','--search=hackernews','--quick --days=7 --as-of 2026-09-05','--emit=json --json-profile=agent']) assert.ok(cmd.includes(s),s);
 assert.ok(!cmd.includes('--agent'));assert.ok(!cmd.includes('--mock'));
 const dir='live-current-field-20260905/sqlite-field-a1';const engine=json(`${dir}/engine.json`);
 assert.deepEqual(engine,json(`${dir}/stdout.json`));assert.deepEqual(engine,json(`${dir}/raw/sqlite-database-reliability-raw.json`));
 assert.equal(engine.schema_version,'1.2');assert.deepEqual(engine.source_status,{hackernews:'ok'});assert.equal(engine.results.length,6);assert.equal(engine.window_days,7);
 assert.ok(engine.results.every(r=>r.url&&r.published_at&&r.source==='hackernews'&&typeof r.engagement.points==='number'));
 for(const path of receipt.outcomes[1].report.artifacts){assert.ok(path.startsWith(base+'/'));assert.ok(existsSync(path),path);}
});

test('complete terminal native research messages contain zero browser calls or denied-call loops',()=>{
 const ids=[...receipt.researchReceipt.lineage.map(r=>r.agentId),...json('native-worker-failure.json').map(r=>r.id)];
 for(const id of ids){const t=trace(id);assert.equal(t.complete,true);assert.ok(t.events.some(e=>e.event.type==='agent_settled'));
  const actual=calls(t);const expected=receipt.researchReceipt.lineage.find(r=>r.agentId===id)?.toolCalls??0;assert.equal(actual.length,expected);
  assert.ok(!actual.some(c=>/browser|betterwright|captcha/i.test(c.name)));
  for(const c of actual.filter(c=>c.name==='web_search')){assert.equal(c.arguments.workflow,'none');assert.ok(!('provider' in c.arguments));}
  const errors=t.events.filter(e=>e.event.type==='tool_execution_end'&&e.event.isError);assert.equal(errors.length,0);
 }
});

test('ordinary non-research BetterWright inspection succeeds without QA activation',()=>{
 const r=json('non-research-betterwright.json');assert.equal(r.isError,false);assert.equal(r.details.ok,true);assert.equal(r.source.source,'npm:betterwright');
 const native=JSON.parse(r.text);assert.equal(native.ok,true);assert.equal(native.result.url,'about:blank');assert.equal(native.pi.step,1);assert.equal(native.pi.budgetExhausted,false);
 assert.ok(existsSync(`${base}/non-research-betterwright-proof.png`));
});
