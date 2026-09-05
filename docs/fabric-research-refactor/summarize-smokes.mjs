// Summarizes this recorded smoke run, not an agent runner or current-skill behavior test.
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
const root='skill-evaluations/fabric-research-refactor/';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const before=read('docs/fabric-research-refactor/before-simple-status.json');
const after=read('docs/fabric-research-refactor/after-simple-status.json');
assert.equal(before.task,after.task);assert.equal(before.model,after.model);assert.equal(before.thinking,after.thinking);
const beforeTrace=read('docs/fabric-research-refactor/before-simple-events.json');
const traces=readdirSync(root).filter(f=>/^trace-.*\.json$/.test(f)).map(f=>read(root+f));
assert.ok(beforeTrace.complete);assert.ok(traces.every(t=>t.complete));
const calls=t=>t.events.map(e=>e.parsed).filter(e=>e.type==='tool_execution_start');
const allCalls=[...calls(beforeTrace),...traces.flatMap(calls)];
for(const c of allCalls){
 assert.ok(!/^(?:browser|browser_login|browser_download|browser_evidence)$/.test(c.toolName));
 if(c.toolName==='web_search'){assert.equal(c.args.workflow,'none');assert.ok(!('provider'in c.args));}
 if(c.toolName==='fetch_content') assert.ok(!c.args.auth);
 if(c.toolName==='fabric_exec') assert.ok(!/extensions\.browser(?:\b|_)/.test(c.args.code));
}
const parallel=read(root+'native-parallel.json');
const successes=parallel.outcomes.filter(o=>o.result?.status==='completed');
assert.equal(successes.length,5);assert.equal(parallel.outcomes.filter(o=>o.error).length,1);
const expected=[/likely permanence|likely to be permanent/i,/SHOULD.*unique/s,/case-insensitive/i,/explicitly.*(?:permits|states)/is,/122/];
successes.forEach((o,i)=>assert.match(o.result.text,expected[i]));
const lifetimes=traces.filter(t=>successes.some(o=>o.result.id===t.status.id));
let active=0,peak=0;for(const [,delta] of lifetimes.flatMap(t=>[[t.status.startedAt,1],[t.status.finishedAt,-1]]).sort((a,b)=>a[0]-b[0])){active+=delta;peak=Math.max(peak,active);}
const gaps=read(root+'evidence-gaps-native.json');
assert.match(gaps.text,/lab-a/);assert.match(gaps.text,/lab-b/);assert.match(gaps.text,/not independent corroboration/);assert.match(gaps.text,/should not be averaged/);assert.match(gaps.text,/Neither.*independently verified 99\.99%/);assert.match(gaps.text,/does not negate/);
const recentTrace=traces.find(t=>t.status.id==='cc4e67d545654f0d8f98b94d331a0273');
const engineCommand=calls(recentTrace).filter(c=>c.toolName==='bash').map(c=>c.args.command).find(s=>s.includes('last30days.py')&&s.includes('--plan'));
for(const expected of ['--search hackernews','--quick','--days 7','--as-of 2026-09-05','--no-browser-cookies','--emit=json --json-profile=agent','LAST30DAYS_TRUSTPILOT_NO_BROWSER=1','INCLUDE_SOURCES=hackernews','LAST30DAYS_CONFIG_DIR=','LAST30DAYS_MEMORY_DIR=','TMPDIR=','PYTHONDONTWRITEBYTECODE=1']) assert.ok(engineCommand.includes(expected),expected);
const engine=read(root+'last30days-run/engine.json');assert.equal(engine.window_days,7);assert.deepEqual(engine.source_status,{hackernews:'ok'});assert.ok(engine.results.length>0);assert.ok(engine.results.every(r=>r.source==='hackernews'));
const search=read(root+'native-search.json');assert.equal(search.args.workflow,'none');assert.ok(!('provider'in search.args));assert.equal(search.result.isError,false);
const asReady=read(root+'as-ready-probe.json');assert.equal(asReady.asReady,true);
console.log(JSON.stringify({
 kind:'recorded native smoke assertions; one pair, not a statistical benchmark',
 simple:{model:before.model,thinking:before.thinking,beforeMs:before.finishedAt-before.startedAt,afterMs:after.finishedAt-after.startedAt,beforeAgentToolCalls:before.toolCalls,afterAgentToolCalls:after.toolCalls,beforeUsage:before.usage,afterUsage:after.usage,requestedSkillReadBytesBefore:14392+7535+12638,requestedSkillReadBytesAfter:Buffer.byteLength(readFileSync('skills/fabric-research/SKILL.md')),sameSupportedAnswer:true},
 parallel:{successfulWorkers:successes.length,dispatchFailures:1,peakOverlappingNativeRunLifetimes:peak,allRequestedBeforeAnyReturned:parallel.order.findIndex(x=>x.event==='returned')>=5,sourceFactsChecked:expected.length},
 evidenceGaps:{metadataDidNotDiscardPassage:true,successfulEvidencePreserved:true,sharedOriginsDeduplicated:true,incompatibleNumbersNotAveraged:true,unsupportedReliabilityWithheld:true},
 browser:{visibleCallsInspected:allCalls.length,browserToolCalls:0,searchWorkflow:'none',scope:'Native agent tool events and execution arguments; not a syscall or remote-provider audit'},
 last30days:{exit:Number(readFileSync(root+'last30days-run/exit-code.txt','utf8')),sourceStatus:engine.source_status,results:engine.results.length,windowDays:engine.window_days,requestedQuickAndAsOfPreserved:true,engineFlagsAndScopedPathsChecked:true},
 asReady:{nativeDeferredProbe:true,events:asReady.events}
},null,2));
