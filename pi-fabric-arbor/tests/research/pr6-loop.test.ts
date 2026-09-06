import assert from 'node:assert/strict';
import test from 'node:test';
import { RESEARCH_ACTIONS, CONFIG_SCHEMA, validate } from '../../src/research/contracts.js';
import { researchFacts, stopReason } from '../../src/research/policy.js';
test('PR6 explicit autonomous entry is execute-risk; closed config admits bounded research', () => {
 assert.equal(RESEARCH_ACTIONS.find(a=>a.name==='runResearch')?.risk,'execute');
 validate(CONFIG_SCHEMA,{execution:'research',search:{stopAfterNoGain:5,shiftAfterNoGain:3,stopAfterFailures:2,target:null}});
 assert.throws(()=>validate(CONFIG_SCHEMA,{execution:'research',search:{callback:'unchecked'}}));
});
test('PR6 factual no-gain excludes failed checks, keeps reset, native failures remain unscored',()=>{
 const p:any={run:{material:{baselineEvaluation:'base',candidates:[]},spec:{config:{search:{shiftAfterNoGain:1}}}},attempts:[],evaluations:[],decisions:[]};
 function add(n:number,validity:string,status='applied',state='completed') { const id='h'+n;p.run.material.candidates.push({id,oid:id});p.attempts.push({id,nodeId:id,state});p.evaluations.push({id:'e'+n,attemptId:id,candidateOid:id,validity,state:'completed',invocations:[]});p.decisions.push({nodeId:id,evidenceIds:['e'+n],decision:status==='measured-keep'?'keep':'discard',status}); }
 add(1,'valid');assert.equal(researchFacts(p).noGain,1);assert.equal(researchFacts(p).shiftRequired,true);
 add(2,'invalid');assert.equal(researchFacts(p).noGain,1);assert.equal(researchFacts(p).failedChecks,1);
 add(3,'valid','measured-keep');assert.equal(researchFacts(p).noGain,0);assert.equal(researchFacts(p).shiftRequired,false);
 add(4,'pending','applied','failed');p.evaluations.pop();assert.equal(researchFacts(p).failures,1);assert.equal(researchFacts(p).outcomes.at(-1)?.outcome,'infrastructure-failure');
 add(5,'pending','applied','failed');p.evaluations.pop();assert.equal(researchFacts(p).failures,2);
});
test('PR6 transparent limits distinguish valid no-gain, checks and infrastructure; keeps reset',()=>{
 const p:any={run:{material:{incumbent:'b',baselineEvaluation:'base'},attemptsUsed:0,activeMs:0,activeSince:null,spec:{config:{limits:{attempts:4,evaluatorCalls:10,activeMs:1000,artifactBytes:1000},search:{stopAfterNoGain:2,shiftAfterNoGain:1,stopAfterFailures:2,target:null}}}},attempts:[],evaluations:[],decisions:[],lessons:[]};
 assert.equal(stopReason(p,researchFacts(p),0),'invalid-baseline');
 p.evaluations=[{id:'base',state:'completed',validity:'valid',quality:{passed:true},candidateOid:'b',baselineOid:'b',invocations:[]}];
 assert.equal(stopReason(p,researchFacts(p),0),null);
 assert.equal(stopReason(p,researchFacts(p),1001),'artifact-budget');
 p.run.attemptsUsed=4; assert.equal(stopReason(p,researchFacts(p),0),'attempt-budget');
 p.run.attemptsUsed=0; p.run.activeMs=1000; assert.equal(stopReason(p,researchFacts(p),0),'active-time-budget');
});
