import assert from 'node:assert/strict';
import test from 'node:test';
import {ACTION_MANIFEST,ACTOR_PROPOSAL_SCHEMA,canonical,digest,validate} from '../../src/research/contracts.js';
import {validationSchema as publicValidationSchema} from '../../src/package.js';
import {validationSchema,validationPolicy,splitCapacity} from '../../src/evaluators/validation.js';
import {evaluationCapacity,reservedEvaluationCalls,researchObservation} from '../../src/research/policy.js';
import {commandProgram,researchCommand} from '../../src/research/commands.js';
import {type EvaluationDefinition} from '../../src/evaluators/contracts.js';
const d:EvaluationDefinition={version:1,kind:'agent-suite',baseline:{root:'/tmp/material',oid:'a'.repeat(40),files:['prompt']},candidate:{root:'/tmp/material',oid:'a'.repeat(40),files:['prompt']},tasks:[{id:'dev',prompt:'dev',expected:'GOOD'}],repeats:2,retries:1,deadlineMs:180000,analysis:'paired-descriptive',order:'task-baseline-candidate',subject:{model:'fake/subject',tools:[],promptFiles:['prompt']},judge:{model:'fake/judge',instructions:'Judge exact answer'},command:null,providerAction:null};
const held={...d,tasks:[{id:'held',prompt:'HELD_OUT_DETAIL_SENTINEL',expected:'SECRET_EXPECTED'}]};
test('PR9 frozen split protocol is closed, detached, disjoint and includes task/grading/deadline identity',()=>{
 const raw={version:1,policy:'selected',maxUses:2,criterion:'non-regression',heldOut:structuredClone(held),final:null};const v=validationPolicy(raw,d),id=digest(v);raw.heldOut.tasks[0]!.expected='changed';assert.equal(digest(v),id);assert.notEqual(digest(raw),id);
 for(const change of [{extra:true},{maxUses:0},{maxUses:101},{heldOut:{...held,deadlineMs:9}},{heldOut:{...held,deadlineMs:3600001}},{criterion:'ignore-loss'},{heldOut:d},{heldOut:{...held,subject:{...d.subject,model:'other/model'}}},{policy:'final',final:{...d,tasks:[{id:'final',prompt:'final',expected:'GOOD'}]}}])assert.throws(()=>validationPolicy({...raw,...change},d));
 const snapshot=canonical(v);raw.heldOut.subject.promptFiles.push('alias');raw.heldOut.judge!.instructions='mutated judge';raw.heldOut.tasks.push({id:'alias',prompt:'alias',expected:'alias'});assert.equal(canonical(v),snapshot);
 assert.equal(v.heldOut.deadlineMs,180000);assert.equal(splitCapacity(d),16);assert.equal(evaluationCapacity({run:{spec:{evaluation:d,validation:v}}}),32);
});
test('PR9 held-out credits remain owned after development completes and until exact validation settles',()=>{
 const attempts=[{id:'one',state:'completed',evaluationReservation:8},{id:'two',state:'completed',evaluationReservation:8}];
 const dev={id:'dev',attemptId:'one',state:'completed',split:'development' as const,validationPending:true,invocations:[{},{}]};
 assert.equal(reservedEvaluationCalls(attempts,[dev]),14);
 const held={id:'held',developmentId:'dev',attemptId:'one',state:'completed',split:'held-out' as const,invocations:[{},{}]};assert.equal(reservedEvaluationCalls(attempts,[dev,held]),8);
});
test('PR9 final command uses public execute action but final selection is absent from actor contract',()=>{
 assert.equal(publicValidationSchema,validationSchema);
 const request=researchCommand('validate','run attempt');assert.equal(request.ref,'arbor.evaluate');assert.match(commandProgram(request),/validation/);assert.match(commandProgram(request),/development/);
 const action=ACTION_MANIFEST.find(a=>a.ref==='arbor.evaluate')!;assert.equal(action.risk,'execute');assert.ok(action.commands.includes('/arbor validate'));assert.equal(canonical(ACTOR_PROPOSAL_SCHEMA).includes('"validation"'),false);assert.throws(()=>researchCommand('validate','run'));
});
test('PR9 ordinary research observation excludes held-out tasks, grades, rankings and native IDs',()=>{
 const e={id:'dev',attemptId:null,state:'completed',validity:'valid',quality:{passed:true},baselineOid:'a',candidateOid:'a',invocations:[],analysis:'dev analysis'};
 const p:any={run:{material:{incumbent:'a',baselineEvaluation:'dev'},attemptsUsed:0,activeMs:0,activeSince:null,steering:[],spec:{evaluation:d,validation:{heldOut:held,policy:'selected'},config:{objective:{direction:'maximize'},material:{mutablePaths:['prompt'],kind:'instructions'},search:{mode:'auto',concurrency:1,shiftAfterNoGain:2,stopAfterNoGain:2},limits:{attempts:2,evaluatorCalls:100,activeMs:600000,artifactBytes:100000}}}},nodes:[],attempts:[],decisions:[],lessons:[],controls:[],evaluations:[e,{...e,id:'HELD_ID_SENTINEL',split:'held-out',analysis:'HELD_OUT_DETAIL_SENTINEL'}]};
 const result=canonical(researchObservation(p,0,[]));assert.doesNotMatch(result,/HELD_ID_SENTINEL|HELD_OUT_DETAIL_SENTINEL|SECRET_EXPECTED/);assert.match(result,/dev analysis/);
});
